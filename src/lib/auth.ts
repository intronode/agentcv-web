/**
 * Auth.js v5 (NextAuth beta) — full server-side configuration.
 *
 * IMPORTANT: This file imports better-sqlite3 (via db/queries).
 * It runs only in the Node.js runtime (server components, API routes).
 * It MUST NOT be imported by src/middleware.ts — use auth.config.ts there.
 *
 * Providers:
 *  - Google OAuth — ONLY when AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET are set.
 *  - Credentials "Dev sign-in" — when NODE_ENV !== 'production' OR DEV_LOGIN=1.
 *
 * Session strategy: JWT (no DB adapter).  Users are persisted manually via
 * upsertUser() so the SQLite users table is populated without a DB adapter.
 */

import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { upsertUser } from './db/queries';
import { authConfig, resolveSecret } from './auth.config';

// ── Dev sign-in gate ─────────────────────────────────────────────────────────

function isDevLoginEnabledFn(): boolean {
  if (process.env['DEV_LOGIN'] === '1') return true;
  if (process.env['DEV_LOGIN'] === '0') return false;
  return process.env['NODE_ENV'] !== 'production';
}

export function isDevLoginEnabled(): boolean {
  return isDevLoginEnabledFn();
}

// ── Provider list ─────────────────────────────────────────────────────────────

function buildProviders(): NextAuthConfig['providers'] {
  const providers: NextAuthConfig['providers'] = [];

  if (process.env['AUTH_GOOGLE_ID'] && process.env['AUTH_GOOGLE_SECRET']) {
    providers.push(
      Google({
        clientId: process.env['AUTH_GOOGLE_ID'],
        clientSecret: process.env['AUTH_GOOGLE_SECRET'],
      })
    );
  }

  if (isDevLoginEnabledFn()) {
    providers.push(
      Credentials({
        id: 'dev-credentials',
        name: 'Dev sign-in',
        credentials: {
          handle: {
            label: 'Handle (username)',
            type: 'text',
            placeholder: 'e.g. alice-dev',
          },
          displayName: {
            label: 'Display name',
            type: 'text',
            placeholder: 'e.g. Alice',
          },
        },
        async authorize(credentials) {
          const handle = (credentials?.handle as string | undefined)?.trim();
          const displayName = (credentials?.displayName as string | undefined)?.trim();
          if (!handle || handle.length < 1) return null;
          const name = displayName || handle;
          // Use a deterministic synthetic email so that repeated dev sign-ins
          // with the same handle reuse the same users row (enabling owner linkage
          // set up in the seed for QA pipelines with DEV_LOGIN=1).
          const syntheticEmail = `${handle}@dev.agentcv.local`;
          const user = await upsertUser({
            email: syntheticEmail,
            name,
            provider: 'dev-credentials',
          });
          return {
            id: String(user.id),
            name,
            email: syntheticEmail,
            image: null,
          };
        },
      })
    );
  }

  return providers;
}

// ── Full config (extends Edge-safe skeleton) ──────────────────────────────────

const fullConfig: NextAuthConfig = {
  ...authConfig,
  secret: resolveSecret(),
  providers: buildProviders(),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== 'dev-credentials') {
        await upsertUser({
          email: user.email,
          name: user.name ?? '',
          image: user.image,
          provider: account.provider,
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token['sub'] = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(fullConfig);

// ── Runtime helpers ───────────────────────────────────────────────────────────

export function isGoogleConfigured(): boolean {
  return !!(process.env['AUTH_GOOGLE_ID'] && process.env['AUTH_GOOGLE_SECRET']);
}
