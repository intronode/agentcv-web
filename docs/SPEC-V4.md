# SPEC-V4.md — AgentCV v4 product specification

> 2026-06-11. Realizes docs/DECISIONS.md (D1–D5) to the floors of
> docs/PRODUCT-BAR.md, scoped to be buildable within Goal 2's 36-hour
> box on the v3 foundation. CORE = must ship and pass the bar; ROADMAP
> = recorded, not built.

## 1. One-line definition

**AgentCV is the registry of working agent configurations — the harness
designs that run real work, published with evidence.** The question it
answers: _"What agent configuration actually works for work like mine —
and what's the evidence?"_

Positioning line (for landing + OG): "Agent = Model + Harness. The
model is rented. The harness is the asset. AgentCV is where working
harnesses show their receipts." _(final copy may be refined in
critique cycles; the thesis content is fixed)_

## 2. Entities (data model)

Evolution of the v3 schema (D5). Renames are conceptual reframes of
existing tables, not new architecture.

### Configuration (first-class; evolved from v3 `teams`)

The unit of the product (D1). Fields, beyond v3 team fields:

- **Comparable fields (D3 — the launch "benchmark" schema):**
  - `topology_type`: enum — `hub_and_spoke | pipeline | peer |
hierarchical | solo_plus_tools | other`
  - `agent_count`: integer
  - `platform`: OpenClaw / Claude Code / Hermes / Codex / LangGraph /
    CrewAI / custom / mixed (cross-platform neutral, §2 spirit)
  - role→model mapping: per-member `role`, `model` (via members join)
  - token economics: metrics with keys `cost_per_task_usd`,
    `cost_per_month_usd` — provenance-labeled or [unknown]
  - outcome metrics: windowed, provenance-labeled (e.g. the flagship's
    90.8% windowed reconciliation, `[derived-from-registry,
window-scoped]`)
  - `industries`: tags (e.g. software-delivery, ops, research, content,
    e-commerce)
  - `task_kinds`: tags (what work it actually runs)
- **Blueprint section (D2):** `why_it_works`, `how_built`, `oversight`
  — prose. Operational DNA, not files.
- **Source layer:** `seed_layer` enum `real | curated | illustrative`
  (formalizes the v3 `illustrative` flag into the three-layer model);
  `source_url` + `source_name` REQUIRED when `curated`.
- Existing: slug, name, tagline, topology prose, owner, status,
  featured, operating-since.

### Agent (component; v3 `agents`, kept)

Component of configurations (D1). Keeps profile pages (component
quality is evidence): model, platform, role history, capabilities,
proof feed, lineage (original/fork/instance), trust tier. Gains
`seed_layer` + `source_url` like configurations.

### Owner, ProofEntry, Metric, Attestation, ContactRequest (v3, kept)

Unchanged semantics. ProofEntry/Metric per-claim provenance
(`self_reported | evidence_linked | attested`) and honest-NULL =
[unknown] rendering are non-negotiable carriers of the honesty
architecture. `contact_requests` gains a `kind` field:
`request_setup | claim | general` (conversion floor).

### Trust model (v3, kept; explainer evolves)

Computed tier ladder `self_reported → evidence_linked → peer_attested →
platform_verified`; `platform_verified` designed, never granted at
launch. Per-claim provenance always visible, never hover-only.

## 3. IA — CORE routes

| Route                       | Surface                                                                                                                                                                                                                                                                                                                          | Bar floor it serves                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `/`                         | Landing: thesis in 10s, positioning line, live counts, featured configurations (≥3), trust-tier strip, dual CTA (browse / request setup)                                                                                                                                                                                         | First-impression credibility         |
| `/configurations`           | THE directory. Search + filters: topology type, platform, industry, agent count band, trust tier, seed layer; sort: recency, tier, agent count. Cards carry comparable fields, not taglines. "Compare" multi-select → `/compare`                                                                                                 | No empty rooms (≥8 entries); density |
| `/configurations/[slug]`    | Detail: header w/ trust badge + layer label · comparable-fields panel · topology (roster with role→model, linked agents) · windowed metrics w/ provenance · token economics (or [unknown]) · blueprint (why/how/oversight) · proof feed · lessons · attestations · source citation (CURATED) · CTAs: request-this-setup, compare | Depth behind every click; flagship   |
| `/compare?ids=a,b[,c]`      | Side-by-side (2–3): comparable fields row-aligned, provenance tags inline, differences scannable, [unknown] honest. Linkable URL                                                                                                                                                                                                 | Comparison is first-class            |
| `/agents`, `/agents/[slug]` | Components directory + profiles (v3 surfaces, restyled to v4 frame: "the components")                                                                                                                                                                                                                                            | Depth; density                       |
| `/owners/[handle]`          | Owner profile: configurations + agents (v3, kept)                                                                                                                                                                                                                                                                                | Depth                                |
| `/harness-engineering`      | The explainer: what harness engineering is, why composition is the pain (cited: Hashimoto, MALBO, Terminal Bench deltas, ~88% failure rate), the trust ladder, what AgentCV does and does NOT verify. Absorbs v3 `/trust` (redirect)                                                                                             | Thesis on the surface                |
| `/submit`                   | Submit-your-configuration form: structured comparable fields + provenance self-declaration, persists, lands as `self_reported`                                                                                                                                                                                                   | Conversion path                      |
| `/request`                  | Request-setup form (kind=`request_setup`, recipient Intronode), reachable from every configuration detail                                                                                                                                                                                                                        | Conversion path (wedge)              |
| 404 / error / loading       | Designed brand surfaces (closes v3 gap #6)                                                                                                                                                                                                                                                                                       | Soundness                            |

APIs: `/api/configurations` (GET list w/ filters, POST submit),
`/api/proof`, `/api/contact` (kind-aware) — validated, persisted, errors
designed.

## 4. Seed plan — ≥30 substantive entities, three honest layers

Target: **≥14 configurations, ≥16 agents, ≥5 owners** (≥35 top-level
entities; floor is 30 with headroom). Directory floors: `/configurations`
≥8 entries ✓, `/agents` ≥8 ✓.

- **REAL (the flagship):** Ari Collective configuration + 4 member
  agents + Intronode owner. Existing seed data with its provenance
  labels preserved verbatim (CLAUDE.md §2.4) — windowed 90.8%
  reconciliation, [unknown] lifetime metrics, husky-incident proof
  entry, lessons. The flagship page must be the best page on the site.
- **CURATED (~8–10 configurations + associated agents):** documented
  from cited public sources, `source_url` required, metrics only as the
  source states (else [unknown]). Candidate sources (verify each at
  seed-authoring time; cite on the entity): Anthropic's published
  multi-agent research system architecture; Claude Code subagent
  patterns from official docs; LangChain's Terminal Bench harness
  write-up (30th→5th); CrewAI published case studies; AutoGen/AG2
  documented topologies; published OpenClaw multi-agent setups;
  MALBO's evaluated configurations. CURATED entries demonstrate that
  honest secondhand documentation beats invented firsthand claims.
- **ILLUSTRATIVE (~4–5 configurations + agents):** clearly labeled
  (dashed-orange mark, layer label in header), used to demonstrate
  breadth of industries (e-commerce ops, content pipeline, research
  swarm) where no citable source exists. Never mixed into REAL/CURATED
  counts in marketing copy.

Nothing invented-as-real. No fourth layer.

## 5. Honesty architecture (rendering rules)

- Every metric: value + provenance tag + `as_of` + note, or [unknown]
  with a reason. [unknown] is styled as product language, not apology.
- Layer label (REAL / CURATED with source link / ILLUSTRATIVE) visible
  on every card and detail header.
- `/compare` never hides an [unknown] — an honest hole in a comparison
  row is the product demo.
- `platform_verified` tier shown in the ladder as "not yet granted to
  anyone" — the ladder's seriousness is the credibility spine.

## 6. Visual bar

Dark, data-dense, premium (Linear/Vercel polish) — per
docs/PRODUCT-BAR.md, judged by its rubric across ≥3 critique cycles.
v3 token system is the base; v4 needs a distinctive identity moment on
the landing + configuration cards (topology glyphs per `topology_type`
are the candidate signature element). Responsive at laptop + mobile.
No decorative emptiness; tables/cards carry real fields.

## 7. CORE flows (must persist, must validate, errors designed)

1. Browse → filter `/configurations` → open detail → all sections
   populated.
2. Select 2–3 configurations → `/compare` → linkable URL renders
   side-by-side.
3. `/submit` a configuration → persists → renders as `self_reported`,
   honest about its tier.
4. Detail → "request this setup" → persists (kind=`request_setup`) →
   confirmation with request ID.
5. Add proof entry to a subject → tier recompute reflected (v3 flow,
   kept).
6. Read `/harness-engineering` → a stranger can explain the thesis
   afterward.

## 8. Explicit NON-GOALS (CORE)

Auth/ownership claiming (deferred with reason since v3; Goal 3
revisits exposure). Clonable artifacts/downloads (D2). Community
review, standardized task suites (D3 roadmap). Two-sided matching
(D4). Production data layer + write hardening (Goal 3's mandate).
Email/notifications. Pagination beyond LIMIT 100 (15→35 entities does
not need it). Light mode. Korean. AgentLab anything.

## 9. Definition of done

Per docs/PRODUCT-BAR.md: rubric ≥4 across all 7 dimensions after ≥3
critique cycles with committed screenshot evidence; floors all met;
build + tsc zero; real-browser prod-mode sweep of all CORE routes;
BUILD-REPORT.md with ≤15-min independent QA checklist. Build passes ≠
done; Laplace's gate + HJ's pass are final acceptance.
