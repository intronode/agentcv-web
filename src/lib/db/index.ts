import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import { seed } from './seed';

export const DB_PATH = path.join(process.cwd(), 'data', 'agentcv.db');

// Survive Next.js dev-server HMR without re-opening connections.
const globalForDb = globalThis as unknown as { agentcvDb?: Database.Database };

function init(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const hasAgentsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
    .get();
  if (!hasAgentsTable) {
    db.exec(SCHEMA_SQL);
    seed(db);
  }
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.agentcvDb) {
    globalForDb.agentcvDb = init();
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
