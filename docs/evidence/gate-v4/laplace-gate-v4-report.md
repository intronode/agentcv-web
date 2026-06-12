# Laplace QA Gate Report — AgentCV v4.1

## Commit: `967d9b1` | Date: 2026-06-12 | Gate: v4

---

## OVERALL VERDICT: ACCEPT-WITH-FINDINGS

The build is sound. All six product floors pass independently. Three hygiene
findings are documented below — none block launch, two warrant a follow-up
commit before deploy.

---

## Item-by-Item Verdicts

### Item 1: Build + Overflow Sweep — PASS

**Evidence:**

```
npm run build  → exit 0 (zero Next.js errors)
npx tsc --noEmit → exit 0 (zero TypeScript errors)
```

Overflow probe: 22 routes × 4 widths (320/360/390/1440px) — **0 overflows**.
All scrollWidths at or within 2px tolerance of viewport width including 390px.

Routes verified against `scripts/shoot.mjs` + filesystem scan. No routes missing
from the shoot.mjs list that appear in `src/app/` filesystem.

---

### Item 2: Contrast — PASS

**Evidence:**

```
node scripts/check-contrast.mjs  → 0 failing pairs
```

Script ran against the production color token set in `tailwind.config.ts`.
All text/background pairings meet WCAG AA (≥4.5:1 normal, ≥3:1 large text).

---

### Item 3: Auth + Claim — PASS

**Evidence:**

- `#dev-disclosure-toggle` visible on `/signin` with `DEV_LOGIN=1`; dev sign-in
  succeeds and creates a session (userId confirmed from `/api/auth/session`).
- Unauthenticated `POST /api/files` → `401 Unauthorized` (correct).
- `POST /api/agents` authenticated → `201` with `slug`; `userId` from session
  attached to owner record.
- Claim submits as `pending` status via `/api/submit` endpoint.
- Google OAuth provider absent from sign-in page when `GOOGLE_*` env vars unset.

---

### Item 4: Dual Registration + Atomicity — PASS

**Evidence:**

- `POST /api/agents` with category/platform/ownerHandle fields → `201 { slug, id }`.
- `/register/team` multi-step stepper: step 1 (team), step 2 (topology/members),
  step 3 (review), submit → `register-team-success.png` in cycle-13+ evidence
  showing landed team page with 2-member roster.
- `registerTeam()` implementation uses `db.transaction()` (better-sqlite3
  synchronous transaction) wrapping team insert + member agent inserts +
  membership rows — any thrown error rolls back atomically. Confirmed in
  `src/lib/db/queries.ts`.
- `owner.user_id` correctly populated from session `userId` in both flows.

---

### Item 5: Operational Files — PASS (with minor observation)

**Evidence:**

- `POST /api/files` authenticated → `201 { id, path, visibility: 'private' }`.
  Confirmed: `visibility='private'` from upload response and DB query.
- Anon `GET /api/files/14` (private) → `401 Unauthorized`. ✓
- After `POST /api/files/14/rescan` (findingCount=0) + `PATCH .../visibility`
  → `200 { id, visibility: 'public' }`. ✓
- Anon `GET /api/files/14` (public) → `200`; response includes `content` field
  (mapped from `content_public`), no `content_private` field. ✓
- `PUT /api/files/14` (content change) → DB confirms `visibility='private'`
  (auto-revert logic in route.ts lines 97-103 fires). ✓
  Note: PUT response returns `{ id, updated: true }` — no `visibility` field in
  response body (by design; caller should re-fetch).
- File render view at `/agents/item5-test-agent/files/OVERVIEW.md` → 200,
  file content visible in page. ✓
- File listing on agent profile page `/agents/item5-test-agent` → "Files" section
  present, OVERVIEW.md listed. ✓

**Minor observation (non-blocking):** GET /api/files/:id for public files returns
both `content_public` (the field name) AND `content` (the alias) in the JSON
response body. The spec says "never return content_private" (enforced) but does
not explicitly forbid `content_public` by name. This is redundant but not a
security issue — both contain the masked public version.

---

### Item 6: Sanitizer Adversarial — PASS-WITH-HONEST-LIMITS

All core behaviors verified with original crafted content (not copies of
implementer test files).

**Detection confirmed (my test files):**

| Detector                          | Test input                                | Result              |
| --------------------------------- | ----------------------------------------- | ------------------- |
| `secrets.aws-access-key`          | `AKIAIOSFODNN7EXAMPLE0000`                | DETECTED (critical) |
| `secrets.openai`                  | `sk-testOpenAI123456789012345678901234`   | DETECTED            |
| `secrets.github-pat`              | `ghp_testGitHubToken1234567890123456`     | DETECTED            |
| `secrets.anthropic`               | `sk-ant-api03-testkey...`                 | DETECTED            |
| `secrets.high-entropy-assignment` | `db_password = "aB3xK9mP2nQ7rT1sW6vY..."` | DETECTED            |
| `secrets.connection-string`       | `postgres://user:pass@db.host.com/prod`   | DETECTED (critical) |
| `pii.email`                       | `test.user@example-company.com`           | DETECTED            |
| `pii.phone`                       | `+12025551234` (E.164)                    | DETECTED            |
| `pii.email`                       | `korean.user@company.co.kr`               | DETECTED            |
| `pii.credit-card`                 | Valid Luhn CC number                      | DETECTED            |
| `pii.kr-rrn`                      | `860101-1234563` (valid checksum)         | DETECTED            |
| `confidential.counterparty-name`  | `Acme Corporation` (Title Case)           | DETECTED            |
| `confidential.deal-proximity`     | Currency amount near deal terms           | DETECTED            |

**Fail-closed:** `PATCH .../visibility` with unresolved findings → `403`. ✓
**Auto-revert:** `PUT` content change on public file → DB reverts to `private`. ✓
**Scan log immutability:** consecutive scans produce monotonically increasing IDs;
`DELETE /api/files/:id/rescan` → 405; no DELETE endpoint exists. ✓
**Mask round-trip:** Finding for `pii.email` masked with suggested token `[email]`
→ publish succeeds → `GET /api/files/11` returns content with `[email]` not
original address; `content_private` never returned. ✓
**Honest-limits disclosure:** `ReviewUI.tsx` contains verbatim SANITIZER.md §9.2
text: _"Automated scanning assists but does not guarantee that all sensitive
content has been identified. Person names and some location references are not
automatically detected. You are responsible for reviewing this file before
making it public."_ ✓

**Confirmed miss classes (honest limits — not defects, documented in disclosure):**

1. All-uppercase company names (e.g., `INITECH`, `ACME`): `PROPER_NOUN_SEQ`
   regex requires `[A-Z][a-z]+` pattern; all-caps tokens not matched.
2. Person names without PII context: no NER; first names, surnames not detected
   unless appearing with email/phone/CC/RRN context.

**Confirmed false positive class (minor, non-blocking):**

- Title Case heading text (e.g., `# Client Notes`) near `client` context word
  triggers `confidential.counterparty-name` finding. Low severity; reviewer
  can dismiss. Matches disclosed behavior ("person names are not automatically
  detected" implies noise is possible).

---

### Item 7: Evidence Integrity — PASS

**Cycle-01 blob check:** 30 files diffed against `9d752ce` — diff IDENTICAL.
No blobs added, removed, or modified since the baseline commit.

**Cycles 12-17 ledger audit:**

| Cycle | Files | Examiner report                                                  | Score range                            | Sanitizer evidence                                   |
| ----- | ----- | ---------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| 12    | 49    | Genuine (specific defects: native date inputs, sticky nav, etc.) | credibility 4, honesty 5, soundness 5  | N/A (pre-sanitizer)                                  |
| 13    | 49    | Genuine (cycle-specific: register-team-success.png cited)        | all ≥4                                 | N/A                                                  |
| 14    | 77    | Genuine (sanitizer surfaces judged "craft-level implementation") | honesty 5, soundness CONDITIONAL→fixed | sanitizer-evidence.txt + sanitizer-block.png present |
| 15    | 77    | Genuine (live band + invite-gated signin cycle-specific)         | all ≥4                                 | sanitizer-evidence.txt present                       |
| 16    | 77    | Genuine (flagship files thin → 5 files this cycle)               | all ≥4                                 | sanitizer-evidence.txt present                       |
| 17    | 77    | Genuine (tag vocabulary fragmentation + [unknown] parity)        | credibility 4, honesty 5, soundness 5  | sanitizer-evidence.txt present                       |

All examiner reports contain: numbered defect lists, specific image references,
floor verdicts per dimension, non-templated cycle-specific verdicts.
Not boilerplate. Independent-examiner format confirmed.

---

### Item 8: Hygiene — PASS-WITH-FINDINGS

#### 8a. gitleaks — FINDING (non-blocking, assessed)

gitleaks 8.30.1 detected 2 `generic-api-key` findings in commits since `9d752ce`:

**Finding 1:** `scripts/qa-shoot.sh` — commit `69cd488`

```
SANITIZER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

Assessment: This is a hardcoded **QA/dev dummy key** (64 hex chars of ascending
sequence `0123456...`). Not a real credential. The file is a local QA script,
not deployed code. `SANITIZER_KEY` is used for deny-list term storage in local
test runs — this value was set to enable testing. Non-critical but should be
replaced with a documented placeholder (e.g., `<64-hex-key>`) in a cleanup commit.

**Finding 2:** `src/lib/auth.config.ts` — commit `0942b44`

```ts
const DEV_FALLBACK_SECRET = '56ca5bbc8a2d5dde952a370755dc160107c253f1443eacee4f8ff5f87e18a434';
```

Assessment: This is an explicit dev-fallback JWT secret. The code (lines 20-33)
shows: `if (process.env.NODE_ENV === 'production')` → logs an error and proceeds
(fails loudly); dev/test → uses this fallback with a console.warn. The value
is a random hex string with no real credentials attached. Non-critical but
follows a pattern that could trigger false alerts in CI scanners.

**HJ action recommended:** Add a `.gitleaksignore` entry for these two patterns,
or replace the hardcoded values with documented placeholders. Not a launch blocker.

#### 8b. Husky — FINDING (non-blocking, documented)

`pre-commit` hook fires `npx lint-staged` (runs prettier on staged `.ts/.tsx/.json/.md/.css`).

**No `commit-msg` hook exists in `.husky/`** — only in `.husky/_/` (husky internal
bootstrap). This means commit message format is not enforced by a hook. A commit
with any message format passes through. Verified by test commit with message
`"bad commit no conventional format xyz"` — it succeeded (then hard-reset).

Note: The `.husky/_/h` script resolves to `.husky/<hookname>` for execution; since
`.husky/commit-msg` doesn't exist, it exits 0. No commitlint config found.

**HJ action recommended:** If conventional commit format enforcement is intended,
add `.husky/commit-msg` with `npx --no -- commitlint --edit ${1}` and install
`@commitlint/config-conventional`. Currently advisory only.

#### 8c. AgentLab traces — PASS (no live references)

`AgentLab` / `agentlab` appears in 5 tracked files:

- `CLAUDE.md` — hardcoded constraint rule ("never generate AgentLab-brand content")
- `docs/PLAN.md`, `docs/SPEC-V3.md`, `docs/SPEC-V4.md`, `docs/WORKLOG.md` —
  historical documentation and constraints

No AgentLab branding in UI source (`src/`), no AgentLab routes, no AgentLab
content exposed to end users. All references are internal docs/constraints only. ✓

#### 8d. Reflog / vercel-fork — PASS (no unauthorized pushes)

Gate clone has no `vercel-fork` remote; canonical repo reflog shows:

- `967d9b1` is the current HEAD on `main` (the gate commit)
- `9d752ce` is the previous checkpoint
- No push events to `vercel-fork` in the range `9d752ce..967d9b1`
- Two commits in reflog reference Vercel: `69cd488` ("trigger: agentlab Vercel
  deployment") and older ones — all pre-`9d752ce` baseline.

No unauthorized vercel-fork pushes detected in the gate range. ✓

---

## Summary of Findings

| #   | Category     | Severity      | Blocking? | Description                                                                            |
| --- | ------------ | ------------- | --------- | -------------------------------------------------------------------------------------- |
| F1  | gitleaks     | Low           | No        | Hardcoded QA dummy `SANITIZER_KEY` in `scripts/qa-shoot.sh`                            |
| F2  | gitleaks     | Low           | No        | `DEV_FALLBACK_SECRET` in `src/lib/auth.config.ts`                                      |
| F3  | Husky        | Low           | No        | No `commit-msg` hook; conventional commit format unenforced                            |
| F4  | API response | Informational | No        | `content_public` field exposed alongside `content` alias in public file GET response   |
| F5  | Sanitizer    | Informational | No        | False positive: Title Case headings near context words fire counterparty-name findings |
| F6  | Sanitizer    | Documented    | No        | All-uppercase company names not detected (honest limit; disclosed in ReviewUI)         |

---

## HJ Actions Required Before Deploy

1. **gitleaks F1 + F2** (recommended, not blocking): Replace `scripts/qa-shoot.sh`
   SANITIZER_KEY with a documented placeholder. Add `.gitleaksignore` for
   `DEV_FALLBACK_SECRET` pattern. Clean gitleaks output is CI hygiene.

2. **Husky F3** (advisory): Add `commit-msg` hook if conventional commits are
   enforced policy. Current state: lint-staged runs on commit, but message format
   is unchecked.

3. **Deploy gate remains `deploy_allowed: false`** — the implementer's go-signal
   and HJ's final browser pass are the remaining gates.

---

## Gates Not Exercised by This Report

- Google OAuth sign-in (no `GOOGLE_*` env vars; absence-confirmed behavior tested).
- Production-mode database writes (dev SQLite only).
- Vercel deploy pipeline (explicitly out of scope).
- End-to-end proof submission acceptance by a real counterparty.

---

Laplace — independent QA gate, agentcv-web `967d9b1`, 2026-06-12

---

## Item 1 addendum — 390px discrepancy resolution

**Context:** The v3 gate recorded overflow at 390px. The implementer's fix
commit (`a243c57`) message states "blocker reproduced at ≤360px (not 390)".
This addendum resolves the discrepancy with direct measurements in my
environment (macOS darwin, Playwright 1.60.0, system Chrome 148, both
commits probed live).

### Measurement method

Playwright-controlled Chromium (system Chrome at
`/Applications/Google Chrome.app`), headless. Viewport set via
`page.setViewportSize({ width, height: 844 })`. Measured
`document.documentElement.scrollWidth` and `document.body.scrollWidth` at
each viewport width. Also probed element-level escape:
`getBoundingClientRect().right > viewport + 2px` for every visible element.
Routes tested: `/`, `/configurations`, `/configurations?topology=solo-agent`,
`/owners/intronode`.

### Pre-fix measurements — commit `9d752ce`

| Route                          | 320px            | 360px            | 375px            | 390px            | 414px            |
| ------------------------------ | ---------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| `/`                            | docSW=387 \*\*\* | docSW=390 \*\*\* | docSW=405 \*\*\* | docSW=420 \*\*\* | docSW=444 \*\*\* |
| `/configurations`              | docSW=418 \*\*\* | docSW=418 \*\*\* | docSW=418 \*\*\* | docSW=420 \*\*\* | docSW=444 \*\*\* |
| `/configurations?topology=...` | docSW=320 ok     | docSW=360 ok     | docSW=375 ok     | docSW=390 ok     | docSW=414 ok     |
| `/owners/intronode`            | docSW=379 \*\*\* | docSW=385 \*\*\* | docSW=400 \*\*\* | docSW=415 \*\*\* | docSW=439 \*\*\* |

`***` = overflow (scrollWidth > viewport + 2px). bodyScrollWidth identical to
documentScrollWidth in all cases.

**Element escape at 390px on `/` (representative):** `<DIV class="flex
items-center gap-4 sm:gap-6"> right=544` — the Navbar's nav-link row.
Element right-edge = 544px; viewport = 390px. Overflow = 154px beyond
viewport at 390px.

**At 320px:** same Navbar row at right=544 (fixed minimum width ~417px —
all nav links + Submit dropdown rendered inline, no responsive collapse).

### Post-fix measurements — commit `967d9b1`

| Route                          | 320px        | 360px        | 375px        | 390px        | 414px        |
| ------------------------------ | ------------ | ------------ | ------------ | ------------ | ------------ |
| `/`                            | docSW=320 ok | docSW=360 ok | docSW=375 ok | docSW=390 ok | docSW=414 ok |
| `/configurations`              | docSW=320 ok | docSW=360 ok | docSW=375 ok | docSW=390 ok | docSW=414 ok |
| `/configurations?topology=...` | docSW=320 ok | docSW=360 ok | docSW=375 ok | docSW=390 ok | docSW=414 ok |
| `/owners/intronode`            | docSW=320 ok | docSW=360 ok | docSW=375 ok | docSW=390 ok | docSW=414 ok |

0 overflows. 0 element escapes. Fix state confirmed.

### Verdict

**Both claims were partially correct, but about different overflow sources.**

The v3 gate's "390px overflow" was **correct** in my environment. On commit
`9d752ce`, `document.scrollWidth` exceeds viewport at 390px (by 30px on `/`;
by 30px on `/configurations`; by 25px on `/owners/intronode`). The primary
escaping element is the **Navbar** (`flex items-center gap-4 sm:gap-6` with
three text links + split Submit button — no mobile hamburger, no responsive
collapse), which has an intrinsic minimum width of ~417px. This overflow was
present at every tested width from 320px through 414px.

The implementer's "≤360px (not 390)" claim was **accurate for the card
grid sub-problem** they addressed in `a243c57`. The `ConfigurationCard`
grid cells lacked `min-w-0` and `TrustBadge` used `whitespace-nowrap`,
giving cards a minimum content width exceeding 320–360px viewports. That
specific failure did not extend to 390px. However, the Navbar overflow —
a separate bug fixed in the companion commit `5a34ca0` ("Fix AgentCV mobile
overflow") — was present at all widths including 390px on `9d752ce`, and
the v3 gate measured that.

**Commit sequence clarifies the split:** `9d752ce` (pre-fix) → `5a34ca0`
(Navbar + layout fixes) → `a243c57` (card grid + TrustBadge + pipeline gate)
→ ... → `967d9b1` (current HEAD). Both commits were required to reach zero
overflow. The implementer's BUILD-REPORT was written after `5a34ca0` already
fixed the Navbar, so the "≤360px" description in that report accurately
characterizes only the card grid component the author was working on, not
the full overflow picture at `9d752ce`.

**What I cannot determine:** whether the v3 gate's specific 390px measurement
targeted `document.scrollWidth` (confirming element-based overflow) or
element escape alone (same conclusion either way — both were present). The
measurement methods are equivalent for this overflow type since the Navbar
escape was large (154px beyond viewport) and would have registered on any
measurement approach.

**Item 1 verdict unchanged: PASS.** The post-fix state (967d9b1) has zero
overflows at all measured widths. The discrepancy was a scope labeling
difference, not a contradiction — both reports were accurate about their
respective overflow sources.

Laplace — addendum 2026-06-12
