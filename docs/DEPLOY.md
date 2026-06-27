# DEPLOY.md — AgentCV production data layer & deploy architecture

> Goal 3, 2026-06-27. The production data-layer decision (delegated by
> CLAUDE.md §4 / DECISIONS D5) plus how the app connects to it. Step-by-step
> operator actions live in **docs/DEPLOY-RUNBOOK.md**; this file is the "what
> and why". Decision of record: **DECISIONS D8**.

## 1. Decision — libSQL (Turso) via `@libsql/client`

The build phase used `better-sqlite3` (synchronous, native). It is replaced for
production by **libSQL / Turso** (`@libsql/client`).

**Why libSQL over Postgres (Vercel Postgres / Neon):**

1. **Dialect continuity.** libSQL is a SQLite fork. `src/lib/db/schema.ts`
   (SQLite DDL) and every SQL string in `queries.ts`/`seed.ts` work essentially
   unchanged. Postgres would force a dialect rewrite (`SERIAL`, `$1` params,
   `datetime()`, JSON handling) across the whole query layer — far more change
   surface on a QA-accepted codebase.
2. **Fixes the actual gap.** `better-sqlite3` writes to the local filesystem,
   which on Vercel serverless is ephemeral and per-instance: writes vanish
   between invocations and are not shared across instances. libSQL stores data
   in a remote Turso database over HTTP — persistent and shared.
3. **Same code path local↔prod.** `@libsql/client` runs against a local `file:`
   URL (zero cloud credentials) **and** a remote `libsql://…turso.io` URL with
   the identical client API. So local/QA/the fresh-clone smoke exercise the
   _same_ adapter that runs in production — not a divergent path — and the
   zero-env boot still works on the file fallback.
4. **Cost.** Turso's free tier is ample at launch scale (25 teams / 56 agents).
   Provisioning the account is an `[[HJ ACTION]]` (see runbook).

**Cost accepted:** libSQL is async; `better-sqlite3` was sync. Absorbed by an
adapter in `src/lib/db/index.ts` that preserves the `prepare().get()/all()/run()`
call shape as async methods, so the query layer reads almost the same. The two
write transactions (`registerAgent`, `registerTeam`) and the sanitizer's finding
insert use the libSQL transaction API explicitly (commit/rollback).

**Wrong if:** libSQL's local `file:` mode diverges behaviorally from remote in a
way the sweep misses (mitigation: the preview-deploy gate in the runbook runs
the full sweep against the _remote_ Turso DB before any DNS cutover); or the
async conversion introduced a transaction-isolation bug (mitigation: explicit
commit/rollback + the registration-flow QA in the sweep).

## 2. Environment contract

| Var                  | Required | Meaning                                                                                                                                                                           |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL` | prod     | `libsql://<db>-<org>.turso.io` (remote) or `file:…` (local). **If unset, defaults to the local file** `data/agentcv.db` — this is what makes the zero-env fresh-clone smoke boot. |
| `TURSO_AUTH_TOKEN`   | prod     | Auth token for the remote `libsql://` URL. Not needed for `file:`.                                                                                                                |

`src/lib/db/index.ts#dbConfig()` is the single resolver. `isLocalFile` is true for
`file:` URLs and the no-env default; false for `libsql://`.

## 3. Schema readiness & the production seed strategy

- **Local / `file:` mode** — the app self-initializes on first DB access: if the
  `agents` table is missing or `PRAGMA user_version` ≠ `SCHEMA_VERSION`, it drops
  and rebuilds from `SCHEMA_SQL` + `seed()`. Local data is disposable
  (`data/` is gitignored). `npm run db:reset` forces this.
- **Remote / production** — the app **never** auto-migrates a remote DB from the
  request path (that would risk wiping live data). Schema + seed are applied
  **once, out-of-band**, by `npm run db:push` (guarded: requires
  `TURSO_DATABASE_URL` + `CONFIRM_DB_PUSH=1`). Re-running `db:push` resets the
  remote DB to the seed baseline. This is the production seed strategy.

Both `db:reset` and `db:push` are the same `resetDb()` operation against whatever
`TURSO_DATABASE_URL` points at — DROP all tables → `SCHEMA_SQL` →
`seed()`. The seed carries the real flagship provenance (Ari Collective) and the
CURATED/illustrative layers; its provenance labels are preserved verbatim.

## 4. Schema v8 — `contact_requests` nullable migration

`SCHEMA_VERSION` 7→8. `contact_requests.subject_type` and `subject_id` are now
**nullable**; a subjectless request (e.g. a generic "request this setup" with no
referenced team) stores `NULL`/`NULL` instead of the old
`(subject_type='owner', subject_id=0)` sentinel — which was indistinguishable
from a real owner row. `createContactRequest()` stores the real subject or null;
no reader depended on the `0` sentinel. Applied via the normal rebuild (local
drop-and-rebuild; remote `db:push`).

## 5. Runtime & bundling notes

- `next.config.ts` `serverExternalPackages: ['@libsql/client', 'libsql']` keeps
  libSQL's native bindings out of the server bundle so Next traces the real
  `.node` files at runtime. (`better-sqlite3` removed entirely — it is no longer
  a dependency; the QA script `scripts/shoot.mjs` reads the local DB via
  `@libsql/client` too.)
- API routes and Server Components run in the **Node** runtime (they import the
  DB). Only `src/middleware.ts` runs on the Edge — it imports `auth.config.ts`
  only (no DB), unchanged.
- **Foreign keys:** the local `file:` path enables `PRAGMA foreign_keys = ON`.
  The seed and all writes insert in FK-valid order, so behavior does not depend
  on FK _rejection_. Remote Turso FK-enforcement semantics are a libSQL-server
  concern, not a correctness dependency for AgentCV.

## 6. What's NOT here

Operator steps, account creation, env-var entry, OAuth client, Vercel config,
and the DNS cutover are all in **docs/DEPLOY-RUNBOOK.md** with each
`[[HJ ACTION]]` isolated. Security hardening (auth on writes, rate limiting,
headers, SEO) is documented in docs/BUILD-REPORT.md.
