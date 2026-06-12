# BUILD-REPORT.md — AgentCV v4 (Goal 2 exit)

> 2026-06-12. Replaces the v3 report (git history). Product per
> docs/SPEC-V4.md, built on the v3 foundation per docs/DECISIONS.md D5.
> Work ledger: docs/WORKLOG.md. Evidence: docs/evidence/. **Final
> acceptance is the independent pass (Laplace + HJ), not this report.**

## State at exit

- `npx tsc --noEmit` exit 0 · `npm run build` exit 0
  (docs/evidence/final-tsc-output.txt, final-build-output.txt)
- Prod-mode real-browser sweep (chromium via scripts/qa-shoot.sh): all
  14 CORE routes × desktop fold + full + mobile, 2 interaction
  captures, **0 unexpected console errors** (docs/evidence/final-sweep/)
- Seed: 25 configurations · 56 agents · 21 owners — three honest
  layers (1 REAL configuration + 4 REAL agents; 19 curated
  configurations, every one source-fetch-verified; 5 illustrative,
  labeled)
- 10 valid examiner-scored critique cycles (one extra cycle voided for
  an invalid capture, documented). Final examiner pass: **credibility
  4 · density 4 · depth 4 · interaction 4 · honesty 5 · soundness 4 ·
  copy 4** — no dimension below 4. Honesty hit 5 in seven consecutive
  exams; soundness hit 5 twice.

## Independent QA checklist (≤15 minutes)

Setup (2 min): `npm ci && npm run db:reset && npm run build && PORT=3191 npm start`

1. **Home** (1 min): `/` — thesis line readable in 10s; the four stats
   match `db:reset` counts (25/56/50/68%); hero right column shows the
   real flagship card.
2. **Directory + filters** (2 min): `/configurations` — 25 cards, each
   with Outcome/Economics slots and a layer badge; set topology =
   Hub & Spoke → count drops to 4.
3. **Flagship** (2 min): `/configurations/ari-collective` — windowed
   reconciliation 90.8% with provenance note; [unknown] metrics carry
   "NOT ESTIMATED" badges with reasons + why-link; 5 proof entries,
   husky-incident entry links to a real commit.
4. **Compare** (2 min): `/compare?ids=ari-collective,magentic-one,metagpt-pipeline`
   — row-aligned, diffs highlighted, [unknown] cells visible; resize
   to ~390px: stacked rows stay legible.
5. **Honest layers** (1 min): open `/configurations/magentic-one`
   (CURATED — arXiv citation banner) and `/configurations/helios-swarm`
   (ILLUSTRATIVE — dashed banner). Labels must be unmissable.
6. **Write flows** (3 min): `/submit` — submit empty → designed field
   errors; fill minimal valid → lands on a new self-reported detail
   page. From any config: Request this setup → submit → request ID.
   Add an attestation without the disclosure checkbox → designed 400;
   with it → success and honest tier message.
7. **Soundness** (2 min): browser console clean while navigating;
   `/teams` and `/trust` 308-redirect; `/nonexistent` shows the
   designed 404; favicon renders.

Stop the server; verify the port released. Any failure → reject the gate.

## Shipped vs ROADMAP ledger

| Item (recorded order)                                               | Status                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CORE: directory, detail, compare, explainer, submit, request, proof | **Shipped** (cycles 01–11)                                                                                                |
| Community review (SPEC D3 roadmap #1)                               | **Shipped early** — attestations with first-hand disclosure + named-author accountability (commit 4d14486)                |
| Standardized task suites (D3 roadmap #2)                            | **Not shipped — deliberately.** Unsolved research problem (MALBO); promising one at launch would be vapor. Stays roadmap. |
| Agent-level compare                                                 | **Not shipped** — configurations are the first-class unit (D1); cycle-10 examiner noted the gap; roadmap.                 |
| Members field on /submit                                            | **Not shipped** — API accepts members; the form omits them (edge case). Roadmap.                                          |
| Pagination                                                          | **Not shipped** — LIMIT 100 ample at 25/56 entities. Roadmap trigger: directory > 60 entries.                             |
| Auth / ownership claiming                                           | **Goal 3 scope** (deferred since v3 with reason).                                                                         |
| Rate limits, security headers, OG/SEO, sitemap, prod data layer     | **Goal 3 scope** per the goal chain.                                                                                      |

## Known issues / deploy blockers (for Goal 3)

- Open writes on all POST APIs (no auth/rate limits) — fine locally,
  must not deploy as-is.
- better-sqlite3 native module pins deploys to Node runtime; prod data
  layer is Goal 3's decision (docs/DEPLOY.md to come).
- contact_requests subjectless rows use an (owner,0) sentinel — make
  subject nullable in Goal 3's hardening migration.
- postcss vendored-in-next accepted risk: re-evaluate under the
  production threat model in Goal 3 (per goal chain).

## Process notes

- All captures via scripts/qa-shoot.sh (gates: port-free → fresh build
  → buildId match → stylesheet 200 → shoot → PID kill → port-free).
  The gate fired twice on stale-server races and correctly refused to
  produce evidence; one pre-gate capture (cycle-03) was voided and
  does not count toward the cycle floor.
- Examiner scoring was done by a fresh subagent per cycle, given only
  docs/PRODUCT-BAR.md + that cycle's screenshots. Builder self-scores
  were never used.
- Two examiner factual errors were caught and refuted with rendered-
  page evidence (cycle-02 "4 entries"; cycle-11 "no second owner") —
  both traced to evidence-legibility gaps, both fixed structurally
  (fold shots; owners strip).

## Root cause — why 11 cycles missed the narrow-viewport overflow

Independent QA (Laplace's gate, post-cycle-11) flagged horizontal
overflow as a blocker. Eleven prior examiner cycles did not catch it
because all QA evidence was screenshots (PNG files). PNG screenshots
clip at the viewport boundary — if content overflows horizontally, it
simply does not appear in the image. An examiner looking at a mobile
screenshot has no visual signal that `document.scrollWidth` is wider
than the viewport; the overflow is invisible by construction.

**Precise reproduction truth (verified 2026-06-12):** The overflow did
**not** reproduce at exactly 390px. It reproduced at **≤ 360px**. The
root cause was that `ConfigurationCard` grid cells lacked `min-w-0`,
and `TrustBadge` used `whitespace-nowrap`, giving cards a minimum
content width wider than 320–360px viewports. The grid cell's implicit
`min-width: auto` prevented the card from compressing to the column
width, pushing `document.scrollWidth` to ~364px at 320px and ~364px
at 360px. Clean at 375px and wider.

Layout fix (applied 2026-06-12): all card grid cells in `page.tsx`,
`configurations/page.tsx`, `owners/[handle]/page.tsx`, and
`agents/page.tsx` now carry `min-w-0` wrappers. `ConfigurationCard`
padding is `p-4 sm:p-5`. The header row uses `flex-wrap` so TrustBadge
wraps below the title at narrow widths instead of widening the card.
`TrustBadge`'s `whitespace-nowrap` was removed (replaced with
`break-words`). `AgentCard` already had `min-w-0 w-full` on its
root element. No `overflow-hidden` masking was used.

Harness gate widened (applied 2026-06-12): `scripts/shoot.mjs` now
measures `document.documentElement.scrollWidth` and
`document.body.scrollWidth` at **320px, 360px, 390px** (mobile), and
**1440px** (desktop) for every route immediately after page load. The
320/360 measurements use a resize+measure loop on the already-loaded
page (no additional screenshot captures — screenshots stay at 390px).
Results are written to `overflow-report.txt` listing every route ×
width. Any width with `scrollWidth > viewport + 2px` causes
`shoot.mjs` to exit non-zero, which propagates through `qa-shoot.sh`
(`set -euo pipefail`) and fails the entire pipeline. Any recurrence at
320 or 360px will now fail the gate before a reviewer ever sees it.

Vigilance is not the fix. The harness measures it directly.
