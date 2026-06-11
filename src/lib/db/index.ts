import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';
import { seed } from './seed';

export const DB_PATH = path.join(process.cwd(), 'data', 'agentcv.db');

// Survive Next.js dev-server HMR without re-opening connections.
const globalForDb = globalThis as unknown as { agentcvDb?: Database.Database };

function init(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  let db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const hasAgentsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
    .get();
  const version = db.pragma('user_version', { simple: true }) as number;
  if (hasAgentsTable && version !== SCHEMA_VERSION) {
    // Seeded demo DB from an older schema: drop and rebuild rather than
    // crash on missing columns. data/ is disposable by design.
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      fs.rmSync(DB_PATH + suffix, { force: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_SQL);
    seed(db);
  } else if (!hasAgentsTable) {
    db.exec(SCHEMA_SQL);
    seed(db);
  }
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.agentcvDb) {
    globalForDb.agentcvDb = init();
    // Close cleanly on process exit so the WAL is checkpointed and removed.
    // Forensic invariant: an orphaned -wal/-shm pair after the process is
    // gone means the process was killed (SIGKILL/jetsam), not shut down.
    process.once('exit', () => {
      try {
        globalForDb.agentcvDb?.close();
      } catch {
        // closing is best-effort during shutdown
      }
    });
  }
  return globalForDb.agentcvDb;
}

/** Drop the database file and rebuild it from schema + seed. */
export function resetDb(): Database.Database {
  if (globalForDb.agentcvDb) {
    globalForDb.agentcvDb.close();
    globalForDb.agentcvDb = undefined;
  }
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(DB_PATH + suffix, { force: true });
  }
  return getDb();
}
