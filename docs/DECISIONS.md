# DECISIONS.md — the five delegated decisions (v4)

> Recorded 2026-06-11 by Claude Code (Fable 5) under CLAUDE.md §3
> authority. Each decision states the call, the evidence, and the
> conditions under which it would be wrong. Evidence sources: the
> adversarial competitive re-scan (run 2026-06-11, firsthand fetches),
> the v3 codebase inventory (same date), docs/MARKET.md (C1–C5), and
> docs/AUDIT.md.

## D0 (prerequisite) — Adversarial competitive re-scan: the gap is OPEN

**Method.** A research pass on 2026-06-11 attempted to _refute_ the
thesis by finding an entrant occupying the gap (a practitioner platform
sharing working swarm/harness configurations with evidence — topology,
agent count, model-per-role, token economics, outcomes, industry fit —
and comparing them). Firsthand fetches across five vectors:

1. **Claw Mart** (openclawmarketplace.ai, fetched directly): individual
   domain personas (bookkeeper, HR manager, store operator). No swarm
   topologies, no outcomes, no economics, no comparison. NO OVERLAP.
   Adjacent: awesome-openclaw-agents (205 individual SOUL.md templates)
   — parts store, NO OVERLAP.
2. **MCP registries** (Glama fetched directly — 21k+ servers; PulseMCP,
   mcp.so via search; Smithery rate-limited, see residuals): individual
   servers/tools only. Multi-agent listings are orchestration _tools_,
   not configurations. NO OVERLAP.
3. **Framework ecosystems**: CrewAI Marketplace (fetched directly) —
   code templates judged on code quality/docs, zero performance or cost
   metrics. LangSmith Studio — private team observability, no public
   sharing. AutoGen Studio — framework-internal config UI. GPT Store —
   individual GPTs. NO OVERLAP.
4. **Harness-engineering ecosystem**: awesome-harness-engineering README
   (fetched) links format standards, skill collections, and research
   benchmarks (SkillsBench: 86 tasks, research harness) — no
   practitioner config-sharing platform referenced. Terminal Bench
   (tbench.ai, fetched): scores _models_ against tasks; you cannot
   submit your own topology or inspect a submission's full harness.
   NO OVERLAP.
5. **Startup scan**: Product Hunt AI-agents top-10, 8 Show HN launches
   (2026) examined — orchestration frameworks and individual-agent
   products, none a config-sharing/comparison platform. MALBO (arXiv
   2511.11788) abstract re-fetched: "no systematic method documented in
   the literature" — the paper _confirms_ the gap; no product follow-up
   found.

**Verdict: gap open.** Three closest competitors, ranked: (1) CrewAI
Marketplace — multi-agent unit, but pure code templates, no evidence
layer; (2) Claw Mart ecosystem — practitioner energy, but individual
personas only; (3) Terminal Bench — comparison + cost data, but for
models, not practitioner configurations. **No pivot required.**

**Residual unverified** (recorded per epistemics rules): Smithery and
swarms.world returned HTTP 429 — search evidence says both are
individual-unit marketplaces, but firsthand confirmation is PENDING.
Paywalled enterprise tiers (LangSmith, CrewAI Enterprise) could hide a
cross-org config-sharing feature; not accessible. Re-check both at
Goal 3 if convenient; neither changes the call today.

---

## D1 — Unit priority: CONFIGURATION-FIRST, agents as components

**Decision.** The harness/swarm configuration is the first-class
subject of the product. Agents exist as components of configurations
(with their own profile pages, since component quality is part of the
evidence), but the directory, the comparison surface, the landing
narrative, and the conversion path all center on configurations.

**Evidence.**

- The verified pain is _composition_ (CLAUDE.md §1; MALBO), not agent
  discovery. The agent/parts layer is saturated — Claw Mart, 205-agent
  awesome lists, 21k-server registries all sell parts (scan, above).
  Competing there is entering the crowded slice; the open slice is the
  configuration layer.
- The v3 data model already treats teams/swarms as first-class peers of
  agents (src/lib/db/schema.ts) — promotion to first-class is a
  reframing plus comparable-field enrichment, not a rebuild.
- The flagship asset (Ari Collective) is a configuration, not an agent.
- HJ's stated lean (CLAUDE.md §3.1) matches the evidence; confirmed,
  not merely deferred to.

**Wrong if:** early usage shows visitors land on and share agent pages
overwhelmingly over configuration pages (instrument and check post-
launch); or configuration-level evidence proves uncollectable from
practitioners while agent-level evidence flows (watch submissions); or
a credible entrant wins the parts layer _and_ extends upward into
configurations faster than we establish the layer.

## D2 — Sharing depth at launch: KNOWLEDGE + EVIDENCE, not clonable artifacts

**Decision.** Launch shares the _design knowledge and its evidence_:
topology, role→model mapping, oversight model, token economics, windowed
outcomes, lessons, "why this works / how it was built" blueprint prose.
No downloadable/clonable config bundles (no SOUL.md packs, no harness
files) at launch. A structured "request this setup" path is the
substitute for cloning — which is also the consulting wedge.

**Evidence.**

- File sales were rejected 2026-03-08 to avoid Claw Mart collision
  (CLAUDE.md §2 dead-ends; §3.2 history) — the scan confirms the file/
  parts market is occupied and evidence-free, i.e. exactly the
  commoditized layer to avoid.
- ClawHavoc (~335 malicious skills, ~300k users exposed, 2026-02-09;
  MARKET.md C3) makes distributing executable artifacts a trust
  liability that contradicts our trust-first positioning, and we have
  no verification ladder live at launch to mitigate it.
- "Knowledge of the design" is the stated moat and feeds consulting
  conversion (CLAUDE.md §2.5): blueprint = architectural plans, not a
  photo of the house — and not the bricks either.

**Wrong if:** qualified visitors consistently bounce at the absence of
a clone button (measure: request-setup conversion vs. exit on detail
pages); or a competitor with clonable-and-evidenced configs starts
winning the same audience; or the verification ladder matures enough
that signed, verified artifacts become a trust _feature_ rather than a
liability — then revisit as a deliberate v-next, not a drift.

## D3 — "Benchmark" at launch: STRUCTURED COMPARABLE FIELDS + PROVENANCE; review and task suites are roadmap

**Decision.** At launch, "benchmark" means: every configuration carries
a fixed schema of comparable fields — topology type, agent count,
role→model mapping, platform, token economics (cost/task or cost/month),
windowed outcome metrics, industry/task fit — each value provenance-
labeled (self-reported / evidence-linked / attested) or honestly
[unknown], rendered side-by-side in a first-class compare surface.
Community review and standardized task suites are explicitly roadmap
(in that order), not launch.

**Evidence.**

- Standardized task suites for heterogeneous real-work swarms are an
  unsolved research problem (MALBO; SkillsBench is a research harness,
  86 coding-adjacent tasks) — promising one at launch would be vapor.
  Terminal Bench owns the model-vs-fixed-task quadrant already; we
  should not fight it there (scan, above).
- Comparable-fields-with-provenance is buildable now: the v3 metrics
  table already implements per-claim provenance and honest-[unknown]
  rendering (src/lib/db/schema.ts, MetricGrid) — the launch slice is an
  extension, not an invention.
- Honest provenance _is_ the differentiator vs. every scanned entrant
  (none has an evidence layer at all) — the comparison surface makes
  that differentiator visible.

**Wrong if:** users find field-level comparison meaningless without
task normalization ("90% success at WHAT?") — mitigation is the
industry/task-fit field and windowed metric notes; if that proves
insufficient, standardized task framing moves up the roadmap; or if a
credible third-party suite for swarm work emerges, adopt it rather
than compete with it.

## D4 — Product shape: EVIDENCE-BACKED DIRECTORY + COMPARISON, with a consulting-wedge conversion path

**Decision.** AgentCV v4 is a _directory of harness/swarm
configurations with evidence, plus first-class comparison_ — not
two-sided matching, not a marketplace, not a social network, at launch.
The conversion path: browse → inspect a configuration's evidence →
compare → "request this setup" (routed to Intronode, per CLAUDE.md §4
default) or "submit your configuration". Gap confirmed open (D0), so
the pivot clause is not triggered.

**Evidence.**

- Demand side is the riskiest untested assumption (MARKET.md C5).
  Directory+comparison is the shape that is useful at N=1 visitor with
  zero network effects — the flagship alone answers "what does a
  working configuration look like, with receipts". Two-sided matching
  is worthless until both sides exist.
- Every adjacent shape is taken by someone better-positioned:
  marketplace (Claw Mart, CrewAI), registry-catalog (MCP registries,
  saturated per MARKET.md C2), benchmark-leaderboard (Terminal Bench).
  The directory+comparison+evidence composite is the open shape (D0).
- "Agent washing" (Gartner, 2026-05-20; MARKET.md C4) gives the
  evidence-first directory a press-legible reason to exist.

**Wrong if:** the scan missed an entrant (residuals in D0 — Smithery,
swarms.world, enterprise tiers); or post-launch analytics show the
compare surface unused and detail pages treated as marketing pages —
which would say the audience wants matching/hiring, not research, and
the two-sided shape should be pulled forward; or consulting requests
arrive at zero for 90 days while traffic is healthy (wedge mispriced or
misplaced).

## D5 — Stack, schema, IA, visual, and the fate of v3 code: EVOLVE v3, do not rewrite

**Decision.** v4 is built _on_ the v3 codebase. Keep: Next.js 15 / React
19 / Tailwind 4 / TS strict; SQLite + better-sqlite3 for the build phase
(production data layer is Goal 3's explicit decision); the design-token
dark system; the provenance/trust component family (TrustBadge,
ProvenanceTag, MetricGrid, ProofFeed); owners/agents entities; all QA
discipline (husky, evidence files). Evolve: teams → **configurations**
as the first-class subject (D1) with the comparable-field schema (D3);
add the comparison surface, the harness-engineering explainer, the
CURATED seed layer, and the ≥30-entity density; add error/loading
surfaces and close v3's known gaps where they touch CORE. IA and visual
identity evolve with the configuration-first reframe; the bar is
docs/PRODUCT-BAR.md, judged per critique cycle.

**Evidence.**

- v3 passed independent QA (Laplace, ACCEPT-WITH-FINDINGS, findings
  resolved; docs/BUILD-REPORT.md) and the inventory (2026-06-11) found
  zero structural debt carried from v2 — defects were scrapped, not
  patched. Estimated 50–60% of v4 effort is already standing.
- The concepts v4 needs most — per-claim provenance, illustrative
  flags, computed trust tiers, team-as-subject, lineage — are already
  load-bearing in the v3 schema (src/lib/db/). A rewrite would
  re-implement them at risk, inside Goal 2's 36-hour box.
- Real flagship data (applied 2026-06-11 from Ari's packet, provenance-
  labeled in seed) lives in this codebase; CLAUDE.md §2.4 requires
  preserving its provenance labels — easiest done in place.
- Known v3 gaps (15/30 entities, no comparison, no CURATED layer, open
  writes, no error pages) are all _additive_ work, none demands
  demolition. Open writes and the better-sqlite3 deploy constraint are
  Goal 3 concerns by design.

**Wrong if:** the configuration-first comparable-field schema turns out
not to be expressible as an evolution of the teams/metrics tables
(checkpoint: PLAN.md M1 — if the migration fights back, stop and
reassess rather than force it); or the visual reframe demands layout
primitives the v3 component family can't stretch to (checkpoint: first
critique cycle scores dimension 1 or 2 below 3).

---

## What's NOT in this file

No production data-layer choice (Goal 3, per the goal chain). No
verification-ladder design beyond launch labeling (roadmap). No pricing
or consulting-engagement terms (HJ business direction). The CORE scope
realizing these decisions is docs/SPEC-V4.md; sequencing is
docs/PLAN.md.

---

# v4.1 addendum (2026-06-12, per HJ's v4.1 goal directive)

## D6 — Entity naming: TEAM, with topology as a field

**Decision.** The first-class entity is named **Team** (was
"Configuration" in v4). Topology remains a structured comparable field
on the Team. Routes move to /teams (with /configurations 308-ing to
/teams — inverting the v4 redirect; v3-era /teams URLs become canonical
again). The registration flow offers five named topologies:
`supervisor · orchestrator_worker · swarm · pipeline · router`; the
enum additionally retains `solo_plus_tools` and `other` for entities
that are honestly neither (mapping for existing data:
hub_and_spoke→orchestrator_worker, hierarchical→supervisor,
peer→swarm, pipeline→pipeline, solo_plus_tools/other retained).

**Reasoning.** Practitioners say "my agent team"; the industry
converged on the word (agent teams in Claude Code, team topologies in
the framework literature). "Configuration" was precise but jargon-cold
at the exact moment a stranger decides whether the product is for
them. Nothing in D1 changes: the first-class unit is still the
multi-agent composition with agents as components — only its name
moves toward the user's vocabulary while topology stays the
comparable, filterable axis (D3 unchanged).

**Wrong if:** "Team" pulls submissions toward HR-style human-team
profiles (watch early submissions); or topology stops being scanned as
the primary comparison axis once demoted from the entity name
(comparison analytics).

## D7 — D2 evolution: viewable operational source ≠ clonable artifacts

**Decision.** Teams and agents may publish their operational markdown
files (CLAUDE.md, AGENTS.md, SOUL.md, LESSONS.md, rules/ and similar)
rendered read-only in a GitHub-grade viewer, with per-file
public/private visibility, private-by-default, and a mandatory
sanitization review (secrets, PII, business-confidential references)
before anything goes public. This EVOLVES D2 rather than reversing it:
what we add is _viewable evidence depth_ — operational source as
proof — not downloads, not packaging, not one-click cloning, not a
marketplace. The Claw Mart differentiation (parts store, file sales)
stays intact: AgentCV still sells understanding, and now shows more of
the receipts.

**Reasoning.** D2's moat was "knowledge of the design"; rendered
source files are the strongest honest evidence of design knowledge.
The risk D2 guarded against was commoditized artifact distribution —
that risk attaches to _packaged, clonable_ artifacts, not to read-only
rendered text with sanitization gates. ClawHavoc-class supply-chain
risk (MARKET.md C3) does not attach to non-executable rendered
viewing.

**Wrong if:** users systematically copy-paste rendered files as
de-facto downloads AND that demonstrably erodes the consulting wedge
(measure request-setup conversion before/after); or sanitization
failures leak real secrets/PII (visibility gate must fail closed —
see docs/SANITIZER.md).

---

# Goal 3 addendum (2026-06-27)

## D8 — Production data layer: libSQL (Turso) via `@libsql/client`

**Decision.** The production data layer is **libSQL / Turso** (`@libsql/client`),
replacing `better-sqlite3` (the build-phase driver, deferred to Goal 3 by D5).
Full reasoning + architecture in docs/DEPLOY.md; operator steps in
docs/DEPLOY-RUNBOOK.md.

**Reasoning.**

- **Dialect continuity.** libSQL is a SQLite fork — `schema.ts` and every SQL
  string in `queries.ts`/`seed.ts` work essentially unchanged. Postgres
  (Vercel Postgres / Neon) would force a full dialect rewrite (`SERIAL`, `$1`
  params, datetime/JSON) across the query layer — far more change surface on a
  QA-accepted codebase.
- **Fixes the documented gap.** `better-sqlite3` writes to the local filesystem,
  which on Vercel serverless is ephemeral and per-instance (writes vanish, are
  not shared). libSQL stores data in a remote Turso DB over HTTP — persistent,
  shared. (This was the explicit Goal-3 deploy blocker in BUILD-REPORT.)
- **Same code path local↔prod.** The client runs against a local `file:` URL
  (zero cloud credentials) and a remote `libsql://…turso.io` URL with the
  identical API, so QA and the fresh-clone zero-env smoke exercise the _same_
  adapter that runs in production.
- **Cost.** Turso free tier is ample at launch scale; account provisioning is an
  `[[HJ ACTION]]` (the cloud-secrets gate).

**Cost accepted.** libSQL is async; `better-sqlite3` was sync. Absorbed by an
adapter that preserves the `prepare().get/all/run` shape as async methods; the
two write transactions use the libSQL transaction API explicitly. (~50 call sites
converted to `await`; verified by tsc-strict + the full sweep.)

**Wrong if:** libSQL's local `file:` mode diverges from remote behavior in a way
the sweep misses (mitigation: the runbook's preview-deploy gate runs the full
sweep against the _remote_ Turso DB before any DNS cutover); or a transaction
isolation bug surfaces (mitigation: explicit commit/rollback + registration-flow
QA); or launch scale outgrows the Turso free tier (revisit plan, not driver).
