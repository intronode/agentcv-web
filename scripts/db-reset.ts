import { resetDb, DB_PATH } from '../src/lib/db';

const db = resetDb();
const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

console.log(`AgentCV database reset at ${DB_PATH}`);
for (const table of [
  'owners',
  'agents',
  'teams',
  'team_members',
  'proof_entries',
  'metrics',
  'capabilities',
  'attestations',
  'contact_requests',
]) {
  console.log(`  ${table.padEnd(18)} ${count(table)}`);
}
