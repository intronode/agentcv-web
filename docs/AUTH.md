# AUTH.md — AgentCV Authentication

Auth.js v5 (NextAuth beta) with JWT sessions. No DB adapter — users are
persisted manually via `upsertUser()`. Zero env vars required for local dev.

## Architecture

```
src/lib/auth.config.ts   — Edge-safe config (no Node deps). Used by middleware.
src/lib/auth.ts          — Full config (Node/SQLite). Used by server components + API routes.
src/middleware.ts        — Edge middleware: reads JWT cookie via auth.config.ts only.
```

The split is required because Next.js middleware runs in the Edge Runtime which
cannot use `better-sqlite3` (native Node module). `auth.config.ts` has no DB
imports; `auth.ts` imports `db/queries` and adds the `upsertUser()` callbacks.

## Providers

| Provider        | Condition                                    | Notes                                    |
| --------------- | -------------------------------------------- | ---------------------------------------- |
| Google OAuth    | `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` set  | Omitted silently if env vars absent      |
| Dev credentials | `NODE_ENV !== 'production'` OR `DEV_LOGIN=1` | No password — handle + display name only |

Suppress dev credentials in a non-production env: set `DEV_LOGIN=0`.

## Session strategy

JWT (no DB adapter). On sign-in:

- Google: `upsertUser()` called in `signIn` callback
- Dev credentials: `upsertUser()` called inside `authorize()`

The internal `users.id` is stored in the JWT `sub` claim and exposed as
`session.user.id`. Downstream code casts this to `Number()`.

## AUTH_SECRET

| Environment                | Behavior                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Dev / local (no cloud env) | Falls back to a low-entropy plain-text constant. `console.warn` emitted once per process.              |
| Production (cloud deploy)  | Must be set. Throws immediately at startup if absent. Gated by `isLocalRuntime()` in `auth.config.ts`. |

"Local" means: none of `VERCEL`, `VERCEL_ENV`, `CF_PAGES`, `AGENTCV_PRODUCTION=1` is set — i.e. your dev machine
or a local `npm start` of the production build. A Vercel or CF Pages deploy always has one of those vars.

Generate a production secret: `openssl rand -base64 32`

## Owner claim flow

1. Signed-in user visits `/owners/:handle` of an unclaimed owner.
2. Sees `<ClaimOwnerButton>` — POST `/api/claim` with `{ ownerHandle }`.
3. API creates a `contact_requests` row: `kind='claim'`, `status='pending'`.
4. UI shows "Claim pending manual review" — no auto-grant.
5. Admin reviews and manually sets `owners.user_id = users.id`.

## Navbar session integration

`src/components/NavbarServer.tsx` is an async server component that calls
`auth()` and passes the user to the client `<Navbar user={user} />`. The
client Navbar renders a `<UserMenu>` (avatar + dropdown + sign-out) when
signed in, or a "Sign in" link otherwise.

## Routes added

| Route                     | Notes                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `/signin`                 | Server component. Renders Google button and/or dev form based on env. |
| `/api/auth/[...nextauth]` | Auth.js v5 catch-all handler.                                         |
| `/api/claim`              | POST — requires session. Creates claim request.                       |

---

## [[HJ ACTION]] — Google OAuth client

> This section requires HJ action. Google OAuth is NOT active until these
> steps are completed. The app runs fine without it (dev form still works).

### Step 1 — Create OAuth client in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: `AgentCV` (or any label).
5. **Authorized redirect URIs** — add both:
   - `http://localhost:3190/api/auth/callback/google` (local dev)
   - `https://agentcv.ai/api/auth/callback/google` (production)
6. Click **Create**. Note the **Client ID** and **Client Secret**.

### Step 2 — Set env vars

**Local dev** — add to `.env.local` (never tracked):

```
AUTH_GOOGLE_ID=<your-client-id>
AUTH_GOOGLE_SECRET=<your-client-secret>
AUTH_SECRET=<generate with: openssl rand -base64 32>
```

**Production (Vercel)** — add to project environment variables:

```
AUTH_GOOGLE_ID=<your-client-id>
AUTH_GOOGLE_SECRET=<your-client-secret>
AUTH_SECRET=<different value from local — openssl rand -base64 32>
SANITIZER_KEY=<generate with: openssl rand -hex 32>  # 64 hex chars, AES-256-GCM key for deny-list term encryption — [[HJ ACTION]]
```

### Step 3 — Verify

After setting env vars, restart the dev server. Visit `/signin` — the
"Continue with Google" button should appear. Sign in and verify:

- `/api/auth/session` returns `{"user":{"name":"...","email":"...","id":"..."}}`
- `data/agentcv.db` `users` table has a row with `provider='google'`

### Consent screen note

If this is a new Google Cloud project, you must configure the OAuth consent
screen (APIs & Services → OAuth consent screen) before the OAuth client
will work for external users. For internal testing, set user type to
"External" and add your email as a test user.
