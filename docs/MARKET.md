# MARKET.md — Claims the v3 Design Depends On

> 2026-06-11. Only claims that SPEC-V3 decisions actually rest on; this is
> not a market survey. Verified via web research (research subagent,
> 2026-06-11); source URLs inline. Tags: [verified+date] / [inferred] /
> [unknown]. Analysis lines are labeled — they are my read, not sourced fact.

## C1. No incumbent does human-facing agent/team identity profiles with proof

**[partially verified 2026-06-11]** No direct equivalent of "public
professional identity + track record + discovery for deployed agents/teams"
was found. Closest comparables:

- **ReputAgent** (reputagent.com) — runtime reputation-scoring SDK
  ("RepKit") for agent-to-agent trust: machine-readable, developer-side
  infrastructure, early access. Not a public profile network.
  — https://reputagent.com/
- **AgentStamp** (agentstamp.org) — cryptographic identity + public registry
  with 0–100 reputation score, append-only audit trail; "trust
  infrastructure" positioning, on-chain bridging, early-stage (live stats
  showed 0 active agents). — https://agentstamp.org/
- **A2Apex** (a2apex.io) — "test, certify, showcase" with public profiles
  and trust badges, but centered on A2A protocol compatibility
  certification. (Site returned 403; characterization from search summaries
  — weakest-sourced item here.) — https://a2apex.io/
- **AgentHub** — academic registry proposal (manifest-based evidence
  records), not a live product. — https://arxiv.org/html/2510.03495v2

*Analysis:* the field is machine-side trust infrastructure; the
human-readable professional-identity layer (LinkedIn-shaped, team/swarm
coverage, connection surfaces) is open. "Partially" because absence is hard
to prove and A2Apex couldn't be fetched directly. **Design dependency:**
justifies building the human-facing profile/proof layer rather than another
scoring SDK; ReputAgent-style runtime scores are a potential future *input*
to profiles, not the product.

## C2. MCP registry space is saturated and server-level, not agent-level

**[verified 2026-06-11]** 6+ active registries; per-registry counts
(Apr–May 2026): mcp.so ~20k, Glama ~21k, MCP Market 10k+, Smithery 7k+,
PulseMCP ~11.8k, official registry ~2k. None offer agent-level identity or
public profile pages; the discovery→governance gap is called out in the
market itself (TrueFoundry).
— https://roxyapi.com/blogs/mcp-registries-where-to-list-your-server-2026
— https://www.truefoundry.com/blog/best-mcp-registries
— https://registry.modelcontextprotocol.io/

**Design dependency:** AgentCV must not be a catalog/listing product
(catalog = saturated, server-oriented). Confirms CLAUDE.md §4 and the
"identity + proof, not listing" center of SPEC-V3.

## C3. The 2026 trust collapse is real and recent

**[verified 2026-06-11]** CVE-2026-25253 ("ClawBleed", CVSS 8.8, cross-site
WebSocket hijacking in OpenClaw, disclosed 2026-02-20) and **ClawHavoc**
(coordinated supply-chain campaign, ~335–341 malicious skills on ClawHub,
detected 2026-02-09, ~300k users exposed, up to ~20% of marketplace
compromised at peak) are both well documented.
— https://repello.ai/blog/clawhavoc-supply-chain-attack
— https://conscia.com/blog/the-openclaw-security-crisis/
— https://blink.new/blog/openclaw-2026-cve-complete-timeline-security-history

**Design dependency:** (a) trust/provenance positioning lands in a primed
market; (b) do **not** brand-couple to ClawHub/OpenClaw — AgentCV stays
cross-platform neutral (SPEC-V3 treats platform as a profile attribute,
never a dependency).

## C4. "Agent washing" is a named, live discourse

**[verified 2026-06-11]** Coined by Gartner (2025), used in a formal Gartner
press release 2026-05-20 (supply-chain symposium); Gartner estimates only
~130 of thousands of self-described agentic vendors are "real"; related
prediction: >40% of agentic AI projects canceled by end-2027. Broad press
uptake.
— https://www.gartner.com/en/newsroom/press-releases/2026-05-20-gartner-warns-of-agent-washing-risks-in-supply-chain-planning-technology-market
— https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027

**Design dependency:** the proof model must visibly distinguish claim
quality. This is why every metric and proof entry in v3 carries a
**provenance tag** rather than a binary "verified" flag the platform can't
yet back (SPEC-V3 §4).

## C5. Demand-side assumption (the honest unknown)

**[unknown]** That builders will *publish* profiles and that
buyers/operators will *consult* them (vs. word-of-mouth, GitHub, Discord)
is untested. No source found proving demand for this category; comparables
in C1 are all early/pre-traction, which cuts both ways (open field vs. no
proven pull).

**Design dependency:** this is the riskiest assumption in the whole plan.
Mitigation in scope: ship the flagship (Ari's team) as a genuinely useful
artifact regardless of network effects, and keep CORE small enough that the
bet stays cheap. Validation is a post-sprint, with-HJ activity.

## What this means (Analysis, my read)

Positioning survives contact with the evidence: trust-gap vocabulary exists
(C3, C4), the adjacent players are machine-side (C1), catalogs are a dead
end (C2). The open risk is demand (C5), which build-phase work cannot
resolve — only sharpen.
