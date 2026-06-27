# DEPLOY-RUNBOOK.md — AgentCV → agentcv.ai

> Goal 3, 2026-06-27. Exact ordered steps to take AgentCV from the QA-passed
> `goal-3-production` branch to live on **agentcv.ai**. The technical decisions
> are settled (docs/DEPLOY.md / DECISIONS D8); this is the operator checklist.
>
> **Every `[[HJ ACTION]]` is one of HJ's three gates** — cloud secrets/accounts,
> agentcv.ai DNS, deploy execution — or the vercel-fork mirror push. Steps
> without that tag are already done in the repo. **Nothing here runs
> automatically.**
>
> **Gate order is mandatory:** Laplace's independent gate (against this runbook +
> the production Turso adapter) **and** HJ's explicit go both precede any public
> DNS cutover (Phase F). Do not cut over on a green preview alone.

---

## Repos (recap, from CLAUDE.md §4)

- **origin** = `intronode/agentcv-web` — canonical. All normal pushes (incl. this
  branch) go here. Done by the build agent.
- **vercel-fork** = `ari-hjunk/agentcv-web` — deploy mirror. Vercel cannot link
  the org repo, so it watches the fork. **Pushing to the fork is the deploy
  trigger and is an `[[HJ ACTION]]`** — never done by the build agent.

---

## Phase 0 — Preconditions (verify before starting)

- [ ] `goal-3-production` is green on origin: `npx tsc --noEmit` 0, `npm run build`
      0, `npm audit` 0 vulnerabilities, qa-shoot + fresh-clone smoke PASS
      (docs/evidence/goal-3/SWEEP-SUMMARY.md).
- [ ] Laplace has gated this branch against the production adapter (run after the
      runbook is in place).
- [ ] Git author/committer email matches the Vercel account owner (Vercel rejects
      mismatched authors). Check `git config user.email`.

---

## Phase A — Accounts, keys & secrets `[[HJ ACTION]]` (cloud-secrets gate)

### A1 — Turso database `[[HJ ACTION]]`

1. Create a Turso account (turso.tech) — free tier is sufficient at launch scale.
2. Create a database (e.g. `agentcv-prod`) in a region near the Vercel region.
3. Capture two values:
   - **Database URL** — `libsql://agentcv-prod-<org>.turso.io`
   - **Auth token** — `turso db tokens create agentcv-prod` (or the dashboard).

### A2 — Google OAuth client `[[HJ ACTION]]`

Follow **docs/AUTH.md → "[[HJ ACTION]] — Google OAuth client"** verbatim. Authorized
redirect URIs to add:

- `https://agentcv.ai/api/auth/callback/google` (production)
- (keep `http://localhost:3190/api/auth/callback/google` for local)
  Capture **AUTH_GOOGLE_ID** and **AUTH_GOOGLE_SECRET**. Configure the OAuth consent
  screen if the project is new.

### A3 — Generate app secrets `[[HJ ACTION]]`

- `AUTH_SECRET` = `openssl rand -base64 32` (distinct from any local value)
- `SANITIZER_KEY` = `openssl rand -hex 32` (64 hex chars — AES-256-GCM key for
  the confidential-terms deny-list; see docs/SANITIZER.md)

Keep all of A1–A3 only in the Vercel env store / a secret manager — never in a
tracked file.

---

## Phase B — Seed the production database `[[HJ ACTION]]`

The app never auto-migrates a remote DB. Seed it **once**, from a machine with the
repo + Node, pointing at the Turso DB from A1:

```bash
TURSO_DATABASE_URL='libsql://agentcv-prod-<org>.turso.io' \
TURSO_AUTH_TOKEN='<token from A1>' \
CONFIRM_DB_PUSH=1 \
npm run db:push
```

Expect a printed table count (owners/agents/teams/team_members/attestations).
`db:push` DROPS and re-seeds — only run it intentionally (re-running resets the
remote DB to the seed baseline). The seed carries the real flagship provenance
(Ari Collective) and the CURATED/illustrative layers, labels preserved.

---

## Phase C — Vercel project & environment `[[HJ ACTION]]` (deploy-execution gate)

1. In Vercel, import the **fork** `ari-hjunk/agentcv-web` as the project (Vercel
   watches the fork, not origin).
2. Framework preset: Next.js. Build command `next build`, install `npm install`
   (default). Node 22 runtime (matches local).
3. Set **Production** environment variables (Settings → Environment Variables):

   | Var                  | Value                                       |
   | -------------------- | ------------------------------------------- |
   | `TURSO_DATABASE_URL` | `libsql://agentcv-prod-<org>.turso.io` (A1) |
   | `TURSO_AUTH_TOKEN`   | token (A1)                                  |
   | `AUTH_SECRET`        | A3                                          |
   | `AUTH_GOOGLE_ID`     | A2                                          |
   | `AUTH_GOOGLE_SECRET` | A2                                          |
   | `SANITIZER_KEY`      | A3                                          |
   | `AUTH_URL`           | `https://agentcv.ai`                        |

   Do **NOT** set `DEV_LOGIN` (dev sign-in must stay off in production — it is
   auto-disabled when `NODE_ENV=production`, which Vercel sets). `VERCEL` is set
   by the platform, so the app's production-secret strictness engages
   automatically (AUTH_SECRET required; local fallback refused).

---

## Phase D — Preview deploy + full-sweep gate (BEFORE any DNS change)

1. `[[HJ ACTION]]` **Mirror push to the fork** to trigger a build:
   ```bash
   git push vercel-fork goal-3-production
   ```
   (Build agent pushes only to origin; this fork push is HJ's.)
2. Vercel produces a **preview deployment** URL. Verify it built against libSQL
   (no better-sqlite3), env vars present.
3. Run the **full sweep against the preview URL** (the real production Turso
   adapter, not local file mode):
   - `scripts/qa-shoot.sh` semantics against the preview origin (per-route
     scrollWidth zero-overflow, zero console errors, contrast AA incl. `--auth`),
     and a manual pass of the BUILD-REPORT QA checklist.
   - Confirm: Google sign-in works (real OAuth), a signed-in submit creates a row
     in Turso, an unauthenticated POST returns 401, contact rate-limits to 429.
4. If anything fails → fix on origin, re-push the fork, re-gate. **Do not proceed
   to DNS on a red preview.**

---

## Phase E — Laplace gate + HJ go (hard gate)

- [ ] Laplace's independent gate PASSES against the production adapter + this
      runbook.
- [ ] HJ gives an explicit in-session **go** for the public cutover.

Only with both checked does Phase F begin.

---

## Phase F — agentcv.ai DNS cutover from Squarespace `[[HJ ACTION]]` (DNS gate)

1. In Vercel: add the domain `agentcv.ai` (and `www.agentcv.ai`) to the project;
   Vercel shows the required DNS records (an A record / ALIAS to Vercel, or the
   `cname.vercel-dns.com` target).
2. In **Squarespace** (current DNS host for agentcv.ai): update the DNS records to
   Vercel's targets. Lower the TTL beforehand if a fast rollback matters.
3. Wait for propagation; Vercel auto-provisions the TLS cert.
4. Promote the green preview to **Production** in Vercel (or push the approved
   commit to the fork's production branch, per the project's Vercel git config).

Rollback: repoint the Squarespace DNS records back, or revert the Vercel
production alias to the prior deployment.

---

## Phase G — Post-cutover verification `[[HJ ACTION]]`

- [ ] `https://agentcv.ai/` loads; `/teams`, `/agents`, a team detail, `/compare`
      render seeded data.
- [ ] Security headers present (`curl -sI https://agentcv.ai | grep -i
    'content-security-policy\|strict-transport'`).
- [ ] `https://agentcv.ai/sitemap.xml` and `/robots.txt` resolve.
- [ ] Google sign-in round-trips; a signed-in submit persists to Turso and is
      visible after a redeploy (proves persistence, the whole point of D8).
- [ ] `/api/auth/session` returns valid JSON; no UntrustedHost/MissingSecret in
      Vercel logs.

---

## Appendix — the complete `[[HJ ACTION]]` list

1. **A1** Turso account + DB + auth token.
2. **A2** Google OAuth client (redirect URIs, consent screen) — per docs/AUTH.md.
3. **A3** Generate `AUTH_SECRET` + `SANITIZER_KEY`.
4. **B** `npm run db:push` to seed the remote Turso DB (once).
5. **C** Create the Vercel project on the fork + set all production env vars.
6. **D1** `git push vercel-fork goal-3-production` (the deploy-trigger mirror push).
7. **F** agentcv.ai DNS cutover from Squarespace + promote to production.
8. **G** Post-cutover verification.

Gates between: **Laplace gate + HJ go precede Phase F** (Phase E). The build agent
does none of A–G; it only prepares the branch on origin and (with separate
in-session authorization) may assist verification.
