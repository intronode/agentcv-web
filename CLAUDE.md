# AgentCV — Mission Brief (CLAUDE.md)

> June 2026 reset. This file replaces the previous CLAUDE.md (preserved in git
> history; treat it and PRODUCT-SPEC-V2.md as reference, not law). Authored by
> the orchestration session from HJ's direction + Ari's founding-concept dump
> (#ari-agentcv, 2026-06-10). You — Claude Code (Fable 5) — have broad design
> authority here. This file tells you what is fixed, what is yours to decide,
> and what must never happen.

## 1. The mission

Build AgentCV (agentcv.ai): **the LinkedIn + Glassdoor + AngelList for AI
agents** — the public professional-identity, proof, and connection layer for
the agent/swarm era. Profiles are not only for individual agents: **teams and
swarms are first-class subjects**, with hiring/connection surfaces possible
later.

This sprint (now → June 22) covers **research → planning → design → local
development only**. Deployment, operations, and marketing are a later phase
with HJ. The meta-goal: demonstrate that Fable 5 can carry a product
end-to-end with minimal human input. Work accordingly — decide, execute,
report; don't idle waiting for routine approval.

One-line positioning (canonical): _"Claw Mart is where you buy agent
software. AgentCV is where you find agent experts."_

## 2. Founding spirit — preserve even if you scrap everything else

From the original Feb–Mar 2026 concept (source: Ari's memory dump):

1. **Agents need professional identity independent of platform.** Not a
   listing inside GPT Store / ClawHub / LangChain — a public identity layer
   for the agent itself. Cross-platform neutral: OpenClaw, Hermes, Claude
   Code/Codex, custom stacks.
2. **Track record beats marketing copy.** The center of a profile is proof —
   logs, tasks, lessons, uptime, artifacts, workflow history — not taglines.
   "What it actually did and who/what verified it," not "what it could do."
3. **Identity model: template + instance + owner/org.** Humans have one
   identity; agents are cloned, forked, versioned. Agent Template (reusable
   identity/config) → many Deployments/Instances (each with its own metrics,
   logs, reviews) → owned by Builder/Org. Teams/swarms follow the same split:
   Team Template / Swarm Blueprint vs. deployed team instance with proof
   (composition, roles, routing, completed projects, cost/latency, oversight
   model). Many agents are boring alone but valuable as a system.
4. **Ari's team as lived flagship.** Ari/Stanley/Arthur/Laplace is the
   showcase profile — real operating history, real lessons, real team
   topology. Not an invented mascot.
5. **AgentLab flywheel without dominating UX.** Consulting connection
   ("Request Setup" → lead) is the revenue wedge, but the product must feel
   like neutral identity/trust infrastructure, not an AgentLab brochure.

Also inherited: **Blueprint = shareable operational DNA** ("architectural
plans, not a photo of the house"). Do not rebuild it as file sales (Claw Mart
owns that); reinterpret it as _why this agent works / how it was built / what
evidence backs it_. The early privacy/sanitizer idea (preserve patterns,
generalize specifics — regex → semantic filter → owner review) is a long-term
moat concept worth keeping in the architecture's line of sight, even if not
built now.

## 3. Dead ends — do not re-explore

Each was considered and rejected with reasons (Ari's record):

- **Direct agent-package/file marketplace** — small TAM, high copyability,
  privacy risk, Claw Mart owns distribution.
- **Korean-first product** — 100% global/US; Linear/Vercel aesthetic; no
  Korean sensibility in UI/product.
- **Enterprise-first** — slow; indie builders/SMBs move first. Enterprise is
  a later trust tier, not the wedge.
- **App store** — "You're not selling agents. You're building identity +
  discovery + trust."
- **Full verification at launch** — self-reported metrics with honest
  labeling first; but design the verification ladder seriously now
  (Basic → Verified → Certified → Enterprise was the v2 ladder; revise as
  you see fit, keep the trust-ladder principle).

## 4. Market context (June 2026 — re-verify what your decisions depend on)

- ClawHub/OpenClaw trust collapse (CVE-2026-25253, ClawHavoc supply-chain
  attack) is a tailwind for verification positioning and a reason NOT to
  brand-couple with ClawHub. AgentCV is trust infrastructure, not an
  OpenClaw-dependent app.
- MCP registries are saturated (27k+ servers, multiple verification
  entrants — all developer/server-oriented). Catalog listing = top-of-funnel
  surface at most, not the core product.
- Claw Mart (shopclawmart.com) is third-party (Nat Eliason ecosystem).
  Relationship = outbound links only. No shared auth, revenue, or runtime
  dependency.
- "Agent washing" discourse and the business-buyer trust gap directly support
  verified-performance positioning. Closest comparable to track: ReputAgent.

## 5. What is delegated to you

After your code audit: **spec, schema, stack, and keep-vs-scrap are
your call.** Existing Sprint 1–5 code, docs/schema.sql, and PRODUCT-SPEC-V2.md
are disposable reference assets. Salvage what earns its place; delete what
doesn't. Design the v3 product model yourself — the template/instance/team
model in §2.3 is strong input, not a mandate.

## 6. Fixed constraints

- **Language/aesthetic:** English-only UI. Dark-mode default, data-dense,
  premium developer feel ("GitHub profile meets LinkedIn meets Vercel
  dashboard"). Agent cards: metrics visibility over decoration. Visual
  design is fully yours — no external design pass precedes or constrains you.
- **Stack quality bar:** TypeScript strict (no `any`). `npm run build` and
  `npx tsc --noEmit` must pass at every milestone. The repo has husky
  pre-commit hooks (auto-format); keep them working or consciously replace
  them.
- **This sprint:** local development only. No deployments, no cloud secrets,
  no payments, no marketing actions. If a database is needed, use a locally
  runnable option (e.g. SQLite / local Postgres / Supabase local) requiring
  zero cloud credentials.
- **Boundaries (hard):**
  - `~/projects/agentlab-web` — never touch. AgentLab is a separate company
    workstream. Never generate AgentLab code, brand, or copy here.
  - `agentlab` branch on the `vercel-fork` remote — never touch.
  - No Vercel project or domain changes of any kind.
- **Repos:** `origin` = `github.com/intronode/agentcv-web` (canonical).
  `vercel-fork` = `github.com/ari-hjunk/agentcv-web` (kept only because
  Vercel cannot link the org repo; used as a deploy mirror in a later phase —
  do not push to it this sprint). Working checkout: `~/projects/agentcv-web`.

## 7. Definition of done & QA

- **Any dependency change invalidates all prior QA — re-run the full
  route/flow sweep, not a smoke check.** (Added 2026-06-11 after the
  next 15.5.12→15.5.19 bump shipped with only a 2-route smoke test.)
- **Shared-machine server hygiene:** never kill processes by port
  (`lsof -ti :PORT | xargs kill` is forbidden — it kills HJ's and Ari's
  review servers indiscriminately). Every server you start gets its own
  PID file; clean up only PIDs you own. Prefer non-default ports
  (3210+) for verification servers; port 3000 belongs to human review.

- **Build passes ≠ done. Demonstrated behavior = done.** Every "done" claim
  needs evidence: rendered route, DB row, log, screenshot, or trace, saved
  under `docs/evidence/`.
- **No self-QA.** You do not pass your own work to HJ. Final acceptance goes
  through an independent QA pass (Laplace gate or HJ's own browser check).
  Your job is to make that pass trivially easy: reproducible steps, seed
  data, a README quickstart that runs in ≤3 commands.

## 8. Epistemics (anti-hallucination rules — non-negotiable)

1. If you don't know, say so explicitly; look it up or ask. Never fill gaps
   with "probably/usually."
2. Tag unverified facts with source + PENDING status; verify before stacking
   expensive decisions on them.
3. Compile/stdout success is a precondition, not completion evidence.
4. No self-QA (see §7).
5. Declare your biases when a recommendation may be preference-driven; state
   the conditions under which your recommendation would be wrong.
6. Re-check anything that can change (prices, APIs, tool capabilities,
   competitor states) — confidence is not fact.
7. If you were wrong, correct immediately and explicitly. Never rationalize
   or bury it. A mistake is 100× better than a cover-up.
8. Facts only HJ can know get explicit `[[NEEDS CONFIRMATION: ...]]`
   placeholders — never guesses.

If these rules conflict with a request, the rules win.
