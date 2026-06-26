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

// ── Local-runtime detection ───────────────────────────────────────────────────

/**
 * True outside a recognized cloud deploy platform — i.e. local `next dev`
 * or a developer running the prod build locally (`next start`). Gates
 * zero-config local defaults so a REAL deployment is never weakened.
 */
export function isLocalRuntime(): boolean {
  return !(
    process.env['VERCEL'] ||
    process.env['VERCEL_ENV'] ||
    process.env['CF_PAGES'] ||
    process.env['AGENTCV_PRODUCTION'] === '1'
  );
}

// ── Auth secret ──────────────────────────────────────────────────────────────

// Plain-English words intentionally chosen to avoid hex/base64 patterns.
// Low-entropy and self-documenting — NEVER for production use.
const LOCAL_DEV_FALLBACK = 'agentcv-local-dev-fallback-change-before-deploying';

// One-time warning guard: module-scope let so the warn fires at most once per
// process, not once per call (authConfig + fullConfig each call resolveSecret).
let _localSecretWarnEmitted = false;

export function resolveSecret(): string {
  if (process.env['AUTH_SECRET']) return process.env['AUTH_SECRET'];

  if (!isLocalRuntime()) {
    throw new Error(
      '[AgentCV auth] AUTH_SECRET is required in production. ' +
        'Generate with `openssl rand -base64 32` and set it in the deploy environment.'
    );
  }

  if (!_localSecretWarnEmitted) {
    _localSecretWarnEmitted = true;
    console.warn(
      '[AgentCV auth] AUTH_SECRET not set — using insecure local-dev fallback. ' +
        'This is fine for local development; set AUTH_SECRET before deploying.'
    );
  }

  return LOCAL_DEV_FALLBACK;
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
  // Trust the host when:
  //  - running locally (dev or local prod build) — always safe, no external traffic
  //  - deployed on Vercel — VERCEL env var is set by the platform
  //  - deployed on Cloudflare Pages — CF_PAGES is set by the platform
  //  - operator explicitly set AUTH_TRUST_HOST=true or AUTH_URL (both signal intent)
  trustHost:
    isLocalRuntime() ||
    process.env['AUTH_TRUST_HOST'] === 'true' ||
    !!process.env['AUTH_URL'] ||
    !!process.env['VERCEL'] ||
    !!process.env['CF_PAGES'],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
