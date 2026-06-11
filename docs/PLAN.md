# PLAN.md — v4 build plan (Goal 2 execution map)

> 2026-06-11. Sequences docs/SPEC-V4.md within Goal 2's 36-hour box.
> Each milestone = one commit-worthy concern with its own verification;
> no milestone is "done" on build-pass alone. Time figures are budget
> guides, not promises; the bar (docs/PRODUCT-BAR.md) outranks the
> clock — if the box runs out, cut ROADMAP-ward, never bar-downward.

## Sequencing logic

Schema before seed before surfaces (everything renders from data);
flagship before directory (the best page sets the visual bar the rest
must meet); comparison after detail (it composes detail's fields);
critique cycles only after all CORE surfaces exist (cycle scores on a
partial site are noise). Risks front-loaded: M1 carries the only
decision-threatening unknown (D5's "wrong if" — schema fights the
migration).

## M0 — Baseline & scaffolding _(~1h · risk: low)_

Baseline commit confirmed. Branch stays `main` (solo repo, linear
history). `db:reset` pipeline verified working before any change.

- **Verify:** `git log -1` clean baseline; `npm run build` + `npx tsc
--noEmit` exit 0 on untouched v3; dev server serves `/` from seed.

## M1 — Schema evolution: configuration-first _(~3h · risk: HIGH — the D5 checkpoint)_

`teams` → `configurations` with comparable fields (topology_type,
agent_count, platform, industries, task_kinds); `seed_layer` enum
replacing/absorbing `illustrative` across all entity tables;
`source_url`/`source_name`; `contact_requests.kind`; member role→model
join intact; tier compute unchanged. Schema version bump, auto-rebuild
path intact. v3 seed re-expressed in the new schema (flagship
provenance labels byte-identical).

- **Verify:** `db:reset` exits 0; row counts match v3; a SQL spot-check
  shows flagship metrics unchanged (90.8% + notes + [unknown]s); tsc 0.
- **Checkpoint (D5 wrong-if):** if the model can't express D1/D3
  cleanly here, STOP — reassess against DECISIONS.md before writing
  surfaces. Two failed schema approaches = halt per two-attempt rule.

## M2 — Seed to density: three layers, ≥35 entities _(~5h · risk: medium)_

CURATED layer authored (8–10 configurations + agents, every entity
source-cited, metrics only as sources state); ILLUSTRATIVE breadth
entries (4–5, labeled); REAL flagship untouched. Largest pure-content
block — author in data, not in pages.

- **Verify:** seed counts surfaced (configurations ≥14, agents ≥16,
  owners ≥5, total ≥35); every CURATED row has a live `source_url`
  (spot-check fetch 3 random ones); zero rows invented-as-real
  (layer audit query).

## M3 — Core read surfaces _(~8h · risk: medium)_

`/` landing (thesis in 10s, positioning line) · `/configurations`
directory with full filter/sort/search · `/configurations/[slug]`
detail (all SPEC §3 sections) with **the flagship page built first and
best** · `/agents` + `/agents/[slug]` reframed · `/owners/[handle]` ·
designed 404/error/loading. Topology glyphs introduced here.

- **Verify:** prod-mode (`npm run build && npm start`) manual pass:
  every route renders real seed data, zero console errors; flagship
  page reviewed against "single best page" floor; filters change
  results via URL state; tsc 0.

## M4 — Comparison + explainer _(~5h · risk: medium)_

`/compare?ids=` (2–3 side-by-side, row-aligned comparable fields,
honest [unknown]s, linkable) · directory multi-select entry point ·
`/harness-engineering` explainer with citations (absorbs `/trust`,
redirect in place).

- **Verify:** a compare URL with flagship + one CURATED config teaches
  a visible difference (screenshot); deep-link renders without the
  directory step; explainer cites Hashimoto / MALBO / Terminal Bench
  with links; old `/trust` 308s.

## M5 — Write flows _(~4h · risk: low — v3 patterns reused)_

`/submit` (structured fields → persists → renders as self_reported) ·
`/request` + per-detail CTA (kind=request_setup) · proof-entry flow
re-verified against configurations · API validation + designed errors.

- **Verify:** each flow exercised against the running prod build with
  persistence proof (DB row shown) per docs/evidence/flows/ pattern;
  invalid submissions get designed 400s, not stack traces.

## M6 — Critique cycles to the bar _(~7h · risk: medium — unbounded by nature, bounded by protocol)_

≥3 full cycles per docs/PRODUCT-BAR.md protocol: screenshot every CORE
surface (desktop + mobile) → rubric scores, harshest-critic voice →
name single weakest thing → fix it + surroundings → re-shoot. Evidence
committed under docs/evidence/.

- **Verify:** cycle scores + deltas + screenshot filenames surfaced in
  conversation; no dimension below 4 at exit; cycles that don't beat
  the prior minimum don't count (protocol rule).

## M7 — Sweep, report, handoff _(~3h · risk: low)_

Full real-browser navigation sweep, all CORE routes, prod mode ·
`npm run build` + `npx tsc --noEmit` final outputs captured ·
docs/BUILD-REPORT.md rewritten for v4 with the ≤15-minute independent
QA checklist (Laplace's gate input).

- **Verify:** sweep results + build/tsc output surfaced; checklist
  timed-read ≤15 min; evidence files committed.

## Budget & contingency

Sum ≈ 36h. Pressure valve order (cut from the bottom, record the cut in
BUILD-REPORT): ILLUSTRATIVE breadth beyond the floor → topology-glyph
polish beyond credibility → third comparison slot (2-way is the floor).
Never cut: flagship quality, provenance rendering, the three critique
cycles, designed errors on CORE flows.

## Standing constraints (every milestone)

No deploys; no pushes to vercel-fork; nothing AgentLab; commits at
each milestone boundary (hourly during active coding); husky stays
alive; PID-file process discipline (port 3000 is HJ's); build+tsc zero
at every milestone exit.

## What's NOT in this plan

Goal 3's scope: production data layer, write-API hardening/rate
limits, security headers, OG/SEO, sitemap, deploy runbook. Laplace
gate dispatch (orchestration chat, after Goal 2 clears). Anything
requiring HJ's three gates (cloud secrets, DNS, deploy execution).
