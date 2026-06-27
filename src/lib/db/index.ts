import fs from 'node:fs';
import path from 'node:path';
import {
  createClient,
  type Client,
  type InValue,
  type Row,
  type Transaction,
} from '@libsql/client';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import { seed } from './seed';

/**
 * Production data layer — libSQL (Turso) via @libsql/client.
 *
 * Replaces better-sqlite3 (synchronous native module) which does not persist
 * on serverless filesystems. The SAME async client serves both:
 *   - local / QA / fresh-clone smoke → `file:` URL (zero cloud credentials)
 *   - production                     → `libsql://…turso.io` + auth token
 * so the production adapter is exercised locally, not a separate code path.
 *
 * Env contract (see docs/DEPLOY.md):
 *   TURSO_DATABASE_URL  — `libsql://…` (remote) or `file:…` (local). If unset,
 *                         defaults to the local file below (zero-env boot).
 *   TURSO_AUTH_TOKEN    — required for a remote `libsql://` URL.
 *
 * The better-sqlite3 `prepare().get()/all()/run()` call shape is preserved as
 * async methods so the query layer reads the same; the two write transactions
 * use the libSQL transaction API explicitly (see queries.ts).
 */

const LOCAL_DB_FILE = path.join(process.cwd(), 'data', 'agentcv.db');

/** Back-compat export (scripts referenced the old SQLite path). */
export const DB_PATH = LOCAL_DB_FILE;

// FK-safe drop order (children before parents) for idempotent reset/push.
const TABLES_DROP_ORDER = [
  'rate_limits',
  'owner_confidential_terms',
  'file_findings',
  'file_scan_log',
  'files',
  'attestations',
  'contact_requests',
  'capabilities',
  'metrics',
  'proof_entries',
  'team_members',
  'teams',
  'agents',
  'owners',
  'users',
];

interface DbConfig {
  url: string;
  authToken?: string;
  isLocalFile: boolean;
}

function dbConfig(): DbConfig {
  const envUrl = process.env['TURSO_DATABASE_URL']?.trim();
  if (envUrl) {
    const cfg: DbConfig = { url: envUrl, isLocalFile: envUrl.startsWith('file:') };
    const token = process.env['TURSO_AUTH_TOKEN']?.trim();
    if (token) cfg.authToken = token;
    return cfg;
  }
  // Zero-env default: local SQLite file (dev, QA, fresh-clone prod smoke).
  fs.mkdirSync(path.dirname(LOCAL_DB_FILE), { recursive: true });
  return { url: `file:${LOCAL_DB_FILE}`, isLocalFile: true };
}

// ── better-sqlite3-shaped async adapter ──────────────────────────────────────

export interface RunResult {
  lastInsertRowid: bigint | undefined;
  changes: number;
}

export interface Statement {
  get<T = Row>(...args: Array<InValue | undefined>): Promise<T | undefined>;
  all<T = Row>(...args: Array<InValue | undefined>): Promise<T[]>;
  run(...args: Array<InValue | undefined>): Promise<RunResult>;
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): Promise<void>;
  /** Begin a libSQL write transaction. Caller must commit()/rollback(). */
  transaction(): Promise<Transaction>;
  client: Client;
}

// better-sqlite3 rejected `undefined` binds; the old query layer used `?? null`
// everywhere. Coerce here so the typing stays permissive and no bind is missed.
function coerce(args: Array<InValue | undefined>): InValue[] {
  return args.map((a) => (a === undefined ? null : a));
}

// HMR / warm-invocation singletons.
const globalForDb = globalThis as unknown as {
  agentcvClient?: Client;
  agentcvReady?: Promise<void>;
};

function rawClient(): Client {
  if (!globalForDb.agentcvClient) {
    const { url, authToken } = dbConfig();
    globalForDb.agentcvClient = createClient(
      authToken ? { url, authToken, intMode: 'number' } : { url, intMode: 'number' }
    );
  }
  return globalForDb.agentcvClient;
}

/** Raw wrapper with NO readiness gate — used internally during seed/rebuild. */
function wrapRaw(c: Client): Db {
  return {
    prepare(sql: string): Statement {
      return {
        async get<T = Row>(...args: Array<InValue | undefined>): Promise<T | undefined> {
          const rs = await c.execute({ sql, args: coerce(args) });
          return rs.rows[0] as T | undefined;
        },
        async all<T = Row>(...args: Array<InValue | undefined>): Promise<T[]> {
          const rs = await c.execute({ sql, args: coerce(args) });
          return rs.rows as unknown as T[];
        },
        async run(...args: Array<InValue | undefined>): Promise<RunResult> {
          const rs = await c.execute({ sql, args: coerce(args) });
          return { lastInsertRowid: rs.lastInsertRowid, changes: rs.rowsAffected };
        },
      };
    },
    async exec(sql: string): Promise<void> {
      await c.executeMultiple(sql);
    },
    async transaction(): Promise<Transaction> {
      return c.transaction('write');
    },
    client: c,
  };
}

// ── Schema readiness ─────────────────────────────────────────────────────────

async function ensureReady(): Promise<void> {
  if (!globalForDb.agentcvReady) globalForDb.agentcvReady = initSchema();
  return globalForDb.agentcvReady;
}

async function initSchema(): Promise<void> {
  const { isLocalFile } = dbConfig();
  const c = rawClient();
  if (!isLocalFile) {
    // Remote/production: schema + seed are applied out-of-band, once, via
    // `npm run db:push` (resetDb against TURSO_DATABASE_URL). Never auto-migrate
    // a remote DB from the request path — that would risk wiping live data.
    return;
  }
  await c.execute('PRAGMA foreign_keys = ON');
  const hasAgents =
    (await c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")).rows
      .length > 0;
  const version = hasAgents
    ? Number((await c.execute('PRAGMA user_version')).rows[0]?.['user_version'] ?? 0)
    : 0;
  if (hasAgents && version === SCHEMA_VERSION) return;
  // Fresh or stale (older schema) → drop + rebuild + seed. Local data is
  // disposable by design (data/ is gitignored).
  await rebuild(c);
}

async function rebuild(c: Client): Promise<void> {
  for (const t of TABLES_DROP_ORDER) {
    await c.execute(`DROP TABLE IF EXISTS ${t}`);
  }
  await c.executeMultiple(SCHEMA_SQL);
  await seed(wrapRaw(c));
}

// ── Public API ───────────────────────────────────────────────────────────────

let publicDb: Db | undefined;

/** Get the shared DB handle. Schema readiness is awaited inside each call. */
export function getDb(): Db {
  if (publicDb) return publicDb;
  const c = rawClient();
  const raw = wrapRaw(c);
  publicDb = {
    prepare(sql: string): Statement {
      const st = raw.prepare(sql);
      return {
        async get<T = Row>(...args: Array<InValue | undefined>): Promise<T | undefined> {
          await ensureReady();
          return st.get<T>(...args);
        },
        async all<T = Row>(...args: Array<InValue | undefined>): Promise<T[]> {
          await ensureReady();
          return st.all<T>(...args);
        },
        async run(...args: Array<InValue | undefined>): Promise<RunResult> {
          await ensureReady();
          return st.run(...args);
        },
      };
    },
    async exec(sql: string): Promise<void> {
      await ensureReady();
      return raw.exec(sql);
    },
    async transaction(): Promise<Transaction> {
      await ensureReady();
      return raw.transaction();
    },
    client: c,
  };
  return publicDb;
}

/**
 * Drop every table and rebuild from schema + seed.
 *  - local (`npm run db:reset`)      → resets the local file
 *  - production (`npm run db:push`)  → seeds the remote Turso DB (run ONCE)
 * Both are the SAME operation against whatever TURSO_DATABASE_URL points at.
 */
export async function resetDb(): Promise<Db> {
  const c = rawClient();
  globalForDb.agentcvReady = undefined;
  await rebuild(c);
  globalForDb.agentcvReady = Promise.resolve();
  return getDb();
}
