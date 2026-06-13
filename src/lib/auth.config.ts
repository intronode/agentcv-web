/**
 * Edge-safe Auth.js v5 config fragment.
 *
 * This file is imported by src/middleware.ts which runs in the Edge Runtime.
 * It MUST NOT import anything that depends on Node.js native modules (fs, path,
 * better-sqlite3, etc.).  DB upserts and the full provider config live in
 * auth.ts which is only imported in server components and API routes.
 *
 * Auth.js v5 "split config" pattern:
 *  - auth.config.ts  → Edge-safe skeleton used by middleware
 *  - auth.ts         → Full config (Node.js server only) used by app code
 */

import type { NextAuthConfig } from 'next-auth';

// ── Auth secret ──────────────────────────────────────────────────────────────

export function resolveSecret(): string {
  if (process.env['AUTH_SECRET']) return process.env['AUTH_SECRET'];
  throw new Error(
    '[AgentCV auth] AUTH_SECRET is not set. Set AUTH_SECRET in the environment before starting the app.'
  );
}

// ── Edge-safe config (no DB imports) ─────────────────────────────────────────
//
// Providers are empty here — the Edge middleware only needs the secret and
// session strategy to read/verify the JWT cookie.  The real providers (Google,
// Credentials) are added in auth.ts.

export const authConfig: NextAuthConfig = {
  secret: resolveSecret(),
  session: { strategy: 'jwt' },
  providers: [],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
