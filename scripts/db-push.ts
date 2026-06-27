/**
 * Production seed — applies schema + seed to the Turso DB named by
 * TURSO_DATABASE_URL. This is the production seed strategy (docs/DEPLOY.md):
 * the app NEVER auto-migrates a remote DB from the request path, so this is
 * run ONCE, out-of-band, after the Turso DB is created.
 *
 * DESTRUCTIVE: drops every table and rebuilds from schema + seed. Re-running it
 * resets the remote DB to the seed baseline. Guarded behind CONFIRM_DB_PUSH=1.
 *
 * Usage (see docs/DEPLOY-RUNBOOK.md):
 *   TURSO_DATABASE_URL=libsql://<db>.turso.io \
 *   TURSO_AUTH_TOKEN=<token> \
 *   CONFIRM_DB_PUSH=1 \
 *   npm run db:push
 */
import { resetDb } from '../src/lib/db';

async function main(): Promise<void> {
  const url = process.env['TURSO_DATABASE_URL']?.trim();
  if (!url) {
    console.error(
      '[db:push] TURSO_DATABASE_URL is not set. Refusing to run.\n' +
        '          Set it to your remote libsql:// URL (with TURSO_AUTH_TOKEN).'
    );
    process.exit(1);
  }
  if (url.startsWith('file:')) {
    console.error(
      '[db:push] TURSO_DATABASE_URL points at a local file. Use `npm run db:reset`\n' +
        '          for local resets; db:push is for the remote production DB.'
    );
    process.exit(1);
  }
  if (process.env['CONFIRM_DB_PUSH'] !== '1') {
    console.error(
      `[db:push] This DROPS every table and re-seeds:\n          ${url}\n` +
        '          Re-run with CONFIRM_DB_PUSH=1 to proceed.'
    );
    process.exit(1);
  }

  console.log(`[db:push] Applying schema + seed to ${url} …`);
  const db = await resetDb();
  const count = async (table: string): Promise<number> =>
    ((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()) as { n: number }).n;
  for (const table of ['owners', 'agents', 'teams', 'team_members', 'attestations']) {
    console.log(`  ${table.padEnd(18)} ${await count(table)}`);
  }
  console.log('[db:push] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
