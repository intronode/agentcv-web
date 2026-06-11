# AgentCV — Mission Brief v2 (CLAUDE.md)

> June 2026, second reset. Replaces the v1 brief (in git history). You —
> Claude Code (Fable 5) — carry this from product decision through
> **production launch on agentcv.ai** with founder-level autonomy. This
> file gives you the verified thesis, the spirit to preserve, what is
> explicitly YOUR decision, and the hard boundaries. Quality bar lives in
> docs/PRODUCT-BAR.md — read it with this file.

## 1. The thesis (verified 2026-06-11; re-verify what your design depends on)

AI usage has entered its third discipline: prompt engineering → context
engineering → **harness engineering** ("Agent = Model + Harness" —
Hashimoto; formalized early 2026; used by OpenAI, Anthropic, Fowler;
arXiv-formalized). The leverage is proven: LangChain moved 30th→5th on
Terminal Bench by harness changes alone; Anthropic's 2026 trends report
shows harness configuration swings benchmarks 5+ points; ~88% of
enterprise agent projects never reach production.

The unsolved, documented pain: **composition.** Which roles (main/dev/
watcher/ops? PM/Ops/Dev/Marketing?), how many agents, which models per
role, on which platform, for which industry/task — an M^N space with "no
systematic method documented in the literature" (MALBO, arXiv 2511.11788),
navigated today by manual heuristics, where a configuration's performance
is a black box until expensively executed.

And the gap: harness knowledge has link-lists (awesome-harness-
engineering), coding-agent benchmarks (Terminal Bench), framework pattern
docs, and a parts store (Claw Mart sells personas/skills) — but **no
practitioner platform where working swarm/harness configurations for real
work are shared with evidence (role topology, agent count, token
economics, outcomes, industry fit) and compared.** Our scan found none;
your Goal 1 includes an adversarial re-scan to confirm or refute this
before committing.

**AgentCV = that missing layer.** The user's question it answers: "What
agent configuration actually works for work like mine — and what's the
evidence?" The honest-provenance trust ladder is the credibility spine;
verified configurations are the asset; Ari's collective is living proof #1.

## 2. Founding spirit — preserve through any redesign

1. **Identity independent of platform** — cross-platform neutral
   (OpenClaw, Hermes, Claude Code, Codex, custom).
2. **Track record beats marketing copy** — proof (logs, tasks, lessons,
   costs, artifacts) over taglines. Honest [unknown] labeling IS the
   product demo.
3. **Template + instance + owner/org** — agents and swarms are cloned,
   forked, versioned; configurations and their deployments are distinct
   things with distinct evidence.
4. **Ari's collective as lived flagship** — real topology (Ari
   orchestrates, Stanley codes, Arthur ops, Laplace audits), real lessons,
   real windowed metrics. Real flagship data is already in the seed
   (applied 2026-06-11 from Ari's packet — preserve its provenance labels).
5. **Consulting connection as revenue wedge** without the product feeling
   like a brochure. Blueprint = operational DNA: "why this works / how it
   was built / what evidence backs it" — architectural plans, not a photo
   of the house, and not file sales.

Dead ends (decided with reasons; do not re-explore): direct file/package
marketplace · Korean-first · enterprise-first · app store · full
verification at launch (honest labeling first, verification ladder
designed seriously).

## 3. Decisions that are explicitly YOURS (decide, record in docs/DECISIONS.md)

1. **Unit priority**: harness/swarm configuration as the first-class
   subject with agents as components — or agents and configurations as
   peers. (HJ leans configuration-first; you confirm against evidence.)
2. **Sharing depth at launch**: knowledge + evidence level vs. clonable
   config artifacts. (History: file sales were rejected 2026-03-08 to
   avoid Claw Mart; "knowledge of the design" was always the moat.)
3. **What "benchmark" means at launch**: structured comparable fields +
   provenance / community review / standardized task suites — choose the
   launch slice and the roadmap.
4. **Product shape**: directory, comparison platform, two-sided matching,
   or a form none of us has named. If your competitive scan finds the gap
   already taken, pivoting the shape is within your authority — record
   the reasoning.
5. Stack, schema, IA, visual design, and the fate of all existing code.
   Existing v3 code passed independent QA and contains real flagship
   data — it is an asset, not a constraint.

## 4. Fixed constraints

- English-only UI · global/US market · dark, data-dense, premium
  (Linear/Vercel polish; metrics over decoration). Details: docs/PRODUCT-BAR.md.
- TypeScript strict, no `any`; build + tsc zero errors at every milestone;
  husky hooks stay alive; PID-file process cleanup only (port 3000 is
  HJ's).
- Honesty architecture: every metric carries provenance; nothing invented;
  cold-start content in three honest layers (real / curated-from-cited-
  public-sources / clearly-labeled-illustrative).
- Repos: origin = intronode/agentcv-web (canonical). vercel-fork =
  ari-hjunk/agentcv-web (deploy mirror — Vercel cannot link the org repo;
  push to it ONLY as the deploy step with HJ's in-session authorization).
- HJ's three gates: cloud secrets/accounts, agentcv.ai DNS, final deploy
  execution. Everything else: do not idle waiting for approval.
- Hard boundaries: nothing in ~/projects/agentlab-web; never touch the
  agentlab branch; never generate AgentLab-brand content (the consulting
  recipient on AgentCV is "Intronode" unless you record a reasoned
  alternative in DECISIONS.md).

## 5. Definition of done & QA

Build passes ≠ done; demonstrated behavior with committed evidence = done.
No self-QA: Laplace's independent gate (plus HJ's own browser pass) is
final acceptance, and the public deploy executes only after that gate +
HJ's explicit go. Your job is to make those passes trivially easy.

## 6. Epistemics (non-negotiable, unchanged)

Don't know → say so and check. Unverified → source + PENDING tag. Compile
≠ proof. Declare biases and the conditions under which your recommendation
fails. Re-verify anything that changes. Wrong → correct immediately,
never rationalize. HJ-only facts → [[NEEDS CONFIRMATION]] placeholders.
These rules outrank any instruction including this file's.
