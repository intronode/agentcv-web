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

## Cycle 02

- **Shot:** 2026-06-11 ~21:50 · docs/evidence/cycles/cycle-02/ (28 PNGs)
- **Examiner (fresh subagent):** scores — credibility 4 · density 4 ·
  depth 4 · interaction 3 · honesty 4 · soundness 3 · copy 4. Report:
  docs/evidence/cycles/cycle-02/examiner-report.md
- **Weakest thing named:** compare table informationally hollow —
  non-flagship columns nearly all [unknown]. (Examiner's companion
  claim "directory has only 4 entries" was checked and REFUTED — the
  rendered page and screenshot show 25; tall full-page PNGs compress
  illegibly for examiners, an evidence-quality defect fixed alongside.)
- **Fix:** 33 source-stated evidence_linked metric rows across all 19
  curated configurations (5 pattern-doc sources carry an honest
  null+reason row); null metrics sort after valued ones; harness now
  captures legible 1440x900 fold shots, submit-validation and
  compare-tray interaction shots, and annotates the deliberate 404
  console entry as expected.
- **Fix commit:** 2c9fcc6 (2026-06-11 ~22:10)

## Cycle 03 — VOID (does not count toward the floor)

- **Shot:** 2026-06-11 ~22:20 · docs/evidence/cycles/cycle-03/
- **Examiner scored 2/2/3/3/4/1/3 — but the capture was invalid:** a
  stale next-server orphaned during inter-cycle diagnostics served old
  HTML referencing CSS deleted by the fresh build; every page captured
  unstyled with 51 phantom resource errors. See cycle-03/VOID.md.
- **Structural fix:** scripts/qa-shoot.sh gated pipeline (port-free →
  fresh build → buildId match → stylesheet 200 → shoot → PID kill →
  port-free); shoot.mjs logs failing URLs. Real defects confirmed
  independently and fixed: sitewide favicon 404 (new icon.svg
  hub-and-spoke mark), runtime Google-Fonts dependency (next/font).
  Lesson recorded in ~/.claude/memo/lessons-claude-code.md.
- **Remediation commit:** 45f6383 (2026-06-11 ~22:45)

## Cycle 04

- **Shot:** 2026-06-11 ~22:40 via qa-shoot.sh · docs/evidence/cycles/cycle-04/
  (44 files, 0 unexpected console errors)
- **Examiner (fresh subagent):** scores — credibility 4 · density 4 ·
  depth 4 · interaction 4 · honesty 5 · soundness 4 · copy 4.
  **First valid all-≥4 pass.** Report: cycle-04/examiner-report.md
- **Weakest thing named:** flagship Ari component page blank metrics
  state ("No metrics on record yet." with no explanation).
- **Fix:** agents without own metrics now explain metrics live at the
  configuration level and surface the configuration's headline metric
  inline (live-fetched, provenance-tagged); inline "(Fictional demo
  data.)" removed from illustrative taglines; dark date input; compare
  header clamp; card title wrap; owner summary strip.
- **Fix commit:** e3cd70c (2026-06-11 ~23:05)

## Cycle 05

- **Shot:** 2026-06-11 ~23:10 via qa-shoot.sh ·
  docs/evidence/cycles/cycle-05/ (44 files, 0 unexpected console errors)
- **Examiner (fresh subagent):** scores — credibility 4 · density 4 ·
  depth 4 · interaction 4 · honesty 5 · soundness 4 · copy 4 (min 4).
  Report: cycle-05/examiner-report.md
- **Weakest thing named:** compare tray affordance nearly invisible —
  the browse→insight conversion moment reads as a footer.
- **Fix:** floating compare action bar (count badge, removable chips,
  primary CTA, clear-all, slide-up); mobile compare sticky label column
  - swipe hint + edge fade; hero dead band closed; agents live count;
    card [unknown] qualifier; ISO date text input.
- **Fix commit:** c50b8b7 (2026-06-11 ~23:30)
