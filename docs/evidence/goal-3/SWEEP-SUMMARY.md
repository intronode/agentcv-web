# Goal 3 — production-adapter verification summary (2026-06-27)

Builder-side evidence. Final acceptance is Laplace's independent gate (which
re-runs this against the production Turso adapter) + HJ's browser pass.

## Fresh-clone zero-env prod smoke — PASS

`scripts/smoke-prod-fresh.sh` (fresh `git clone` into /tmp, env scrubbed of
AUTH*SECRET/AUTH_URL/AUTH_TRUST_HOST/DEV_LOGIN/SANITIZER_KEY/TURSO*\*):

- Zero-env `next build` OK (libSQL falls back to the local `file:` DB).
- HTTP 200 on `/ /teams /agents /harness-engineering /signin`.
- `/api/auth/session` → 200 + valid JSON (null).
- Server log clean — no UntrustedHost / MissingSecret / AUTH_SECRET errors.

## Full qa-shoot sweep against the libSQL adapter (prod mode) — PASS

`scripts/qa-shoot.sh` (port 3190; `npm run db:reset` → fresh build → health gate
→ 71 captures → WCAG AA contrast gate incl. `--auth`):

- **71 shots captured · 0 unexpected console errors** (confirms the new CSP does
  not break browser execution — no CSP-violation console errors).
- **Overflow: PASS** on all 20 routes at 320 / 360 / 390 / 1440px (scrollWidth ≤
  viewport+2px). See overflow-report.txt.
- **Contrast: PASS** — 20 public routes + 2 auth routes, 0 routes with failures,
  0 unique failing pairs, 0 uncheckable elements.
- **Interaction captures all pass**, including the now-authenticated
  `register-team-success` (signs in via dev credentials, fills the 5-step
  stepper, submits, lands on the new team detail page — exercising the authed
  write path through the libSQL adapter + the new auth/rate-limit guards) and
  `request-success` (public, rate-limited contact path).
- **Sanitizer evidence** captured (file create → scan → findings → resolve →
  publish, with SQLite-evidence rows read via @libsql/client). See
  sanitizer-evidence.txt.

## Runtime security checks (separate, `next start`, DEV_LOGIN off)

- POST `/api/agents`, `/api/teams`, `/api/proof`, `/api/attestations` → **401**
  when unauthenticated.
- POST `/api/contact` (public) → 201, then **429 + Retry-After** after 5/hr/IP.

## Reproduce

```
npm run smoke:prod            # fresh-clone zero-env smoke
bash scripts/qa-shoot.sh <out-dir> 3190   # full sweep + contrast --auth
```
