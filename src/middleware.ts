/**
 * Auth.js v5 middleware — reads the JWT session cookie on every request so
 * server components can call auth() and get the session.
 *
 * Uses auth.config.ts (Edge-safe, no Node.js native deps) rather than auth.ts
 * (which imports better-sqlite3 and cannot run in the Edge Runtime).
 *
 * No route protection at launch: all routes are public.
 */
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
