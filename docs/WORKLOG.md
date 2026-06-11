# WORKLOG.md — v4 build ledger (Goal 2)

Timestamped record of build milestones and improvement cycles.
Cycle protocol per docs/PRODUCT-BAR.md: shoot all CORE surfaces
(desktop+mobile) → FRESH examiner subagent scores the 7 rubric
dimensions 1–5 from only PRODUCT-BAR.md + the screenshots, harshest-
plausible-critic voice → single weakest thing named → fixed (plus
surroundings) → re-shot in the next cycle. Builder self-scores never
count. All timestamps KST.

## Build milestones (pre-cycle)

- 2026-06-11 19:21 — M0 baseline verified on f9da8f0 (db:reset, tsc 0, build 0)
- 2026-06-11 ~19:40 — M1 configuration-first data layer · commit 0389a1a (D5 checkpoint passed)
- 2026-06-11 ~20:00 — M2 three-layer seed, 66 entities, 8 curated firsthand-verified sources · commit 0e13420
- 2026-06-11 ~20:15 — M3a configurations directory + detail + glyphs + redirects · commit b4be9c1
- 2026-06-11 ~20:30 — M3b landing redesign, components reframe, error surfaces · commit 471030f
- 2026-06-11 ~20:40 — M4 /compare + /harness-engineering explainer (/trust 308) · commit ba7279e
- 2026-06-11 ~20:50 — M5 write flows: /submit, /request, kind-aware contact · commit 1ff293b
- 2026-06-11 ~21:00 — Screenshot harness (playwright + scripts/shoot.mjs)

## Cycle 01

- **Shot:** 2026-06-11 ~21:05 · docs/evidence/cycles/cycle-01/ (28 PNGs, console-log.txt clean except intentional 404)
- **Examiner (fresh subagent, PRODUCT-BAR + screenshots only):**
  scores — credibility 3 · density 3 · depth 3 · interaction 3 ·
  honesty 4 · soundness 4 · copy 3. Full report:
  docs/evidence/cycles/cycle-01/examiner-report.md
- **Weakest thing named:** catalog thinness visible at every filter
  boundary — hub_and_spoke filter returns 3 cards, "no empty rooms"
  floor UNMET on filtered views; illustrative detail pages near-empty
  spec sheets; agent directory cards carry no metrics.
- **Fix:** catalog densified — 11 new source-verified CURATED
  configurations (25 total; no topology bucket <4), illustrative spec
  sheets fully populated, agent cards gain model + configuration-count
  chips, designed thin-slice notice on sparse filters.
- **Fix commit:** bb40237 (2026-06-11 ~21:40)
