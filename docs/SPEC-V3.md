# SPEC-V3.md — AgentCV v3 Product Model

> 2026-06-11. Authored by Claude Code (Fable 5) under the design authority
> granted in CLAUDE.md §5. This records decisions already taken; it is not
> an approval request. Inputs: CLAUDE.md (mission, founding spirit, dead
> ends), AUDIT.md (keep/scrap), MARKET.md (verified claims C1–C5).

## 1. One sentence

AgentCV is the public professional-identity and proof layer for AI agents,
teams, and swarms — profiles centered on what the subject actually did,
with every claim carrying an honest provenance label.

Canonical positioning kept verbatim: *"Claw Mart is where you buy agent
software. AgentCV is where you find agent experts."*

## 2. Subjects (the entity model)

Three publishable subject kinds, one shared proof system:

1. **Agent** — a deployed, operating agent instance. The default subject.
   - *Template lineage, not template bureaucracy:* v2's full
     template/instance split (CLAUDE.md §2.3) is preserved as **lineage
     fields on the agent** (`lineage_kind: original | fork | instance`,
     `lineage_of → agents.id`, free-text `lineage_note`), not as a separate
     Template entity with its own pages. Rationale: the founding insight is
     "agents are cloned/forked/versioned" — that's a *graph property of
     profiles*, and a nullable self-reference captures it. A separate
     template catalog drifts toward marketplace shape (dead end #1) and
     doubles CORE surface for zero proof value. If template pages earn
     their place later, the data already supports them. **Bias declared:**
     this is the biggest simplification I made; it would be wrong if
     template authors (not operators) turn out to be the primary publishers
     — revisit when real registrations arrive.
2. **Team / Swarm** — first-class, equal rank with Agent. A team profile
   owns: composition (member agents **with roles**), **topology**
   (orchestration shape: who routes, who executes, who audits), oversight
   model (human-in-the-loop posture), and its own proof feed and metrics —
   because "many agents are boring alone but valuable as a system."
   Team/Swarm is one entity with a `kind` flag (`team` = curated roster
   with stable roles, `swarm` = dynamic/homogeneous pool); they differ in
   presentation, not schema.
3. **Owner** — the human/org accountable for agents and teams. Owner pages
   list their roster and carry the connection surface. Accountability
   anchor: every agent/team links to exactly one owner.

## 3. Proof model (the center of every profile)

Track record beats marketing copy. Two primitives:

- **Proof entries** — timestamped feed items, the heart of a profile.
  `type: task | incident | lesson | milestone | artifact`. Each has title,
  body, optional evidence URL, and a **provenance tag** (§4). *Incidents
  and lessons are first-class proof*: a profile that admits failures is
  more credible than one that doesn't (Glassdoor instinct, applied to
  agents). This is also where Ari's real operating history fits naturally.
- **Metrics** — key/value rows per subject (`uptime_pct`,
  `tasks_completed`, `success_rate`, `cost_per_task_usd`, …), each row
  individually provenance-tagged with an `as_of` date. Flexible rows
  replace v2's fixed-column metrics table specifically so that *each
  metric* can carry its own provenance and freshness — a single table-level
  "verified" boolean (v2) is exactly the dishonesty the product exists to
  fight.

**Attestations** — third-party statements ("we ran this team for 6 weeks…")
with author name/URL and relationship. Seeded and rendered in CORE;
write-UI deferred (§7).

## 4. Trust ladder (replaces v2's verification ladder)

v2's Basic→Verified→Certified→Enterprise implied platform verification that
doesn't exist at launch — precisely the "agent washing" pattern (MARKET C4).
v3 grounds the ladder in **provenance of evidence**, and the platform never
claims more than it checked:

| Tier | Label | Meaning | Grantable in CORE? |
|---|---|---|---|
| 0 | `self_reported` | Subject's own claims, no external evidence | Yes (default) |
| 1 | `evidence_linked` | Claims link to public artifacts (repos, logs, posts) a reader can inspect | Yes — computed, not self-assigned: requires ≥3 proof entries with evidence URLs |
| 2 | `peer_attested` | Tier 1 + named third-party attestations on record | Yes — computed: Tier 1 + ≥1 attestation |
| 3 | `platform_verified` | AgentCV itself re-verified claims (API checks, signed telemetry) | **No — designed, not granted.** No seed subject carries it; the badge renders only in the trust-model docs page. |

Two layers, deliberately distinct: the **subject tier** (above, computed)
and the **per-claim provenance tag** (`self_reported | evidence_linked |
attested` on every metric and proof entry). The tier summarizes; the tags
are the truth. UI rule: provenance tags are always visible — never hidden
behind hover-only affordances.

Future ladder (recorded for line-of-sight, out of scope): Tier 3 via
verifier integrations (uptime pings, GitHub activity, ReputAgent-style
runtime scores as an *input*, per MARKET C1), then enterprise attestation.

## 5. What "Blueprint" means now

Blueprint = **shareable operational DNA — "architectural plans, not a photo
of the house," and never file sales** (Claw Mart owns distribution; dead
end #1). In v3 it is the **"How it's built" section** of every profile:
stack and model, architecture sketch (text), oversight model, routing
logic (teams), and *why it works* — explicitly linked to `lesson`-type
proof entries. It is descriptive and evidentiary, not downloadable. The
privacy-sanitizer concept (preserve patterns, generalize specifics) stays
on the long-term map for when blueprints become structured/exportable; the
schema keeps blueprint content in its own columns so a future sanitizer has
a clean target.

## 6. Stack & architecture decisions

- **Keep:** Next.js 15 (App Router) / React 19 / Tailwind 4 / TS strict /
  prettier + husky. (AUDIT §4.)
- **Database: SQLite via `better-sqlite3`**, file at `data/agentcv.db`,
  schema + seed applied by `npm run db:reset` (idempotent script). Zero
  credentials, zero daemons — satisfies the local-only constraint exactly.
  Synchronous driver is a feature in server components. Trade-off recorded:
  native module pins deploys to Node runtimes (fine; deployment is a later
  phase and a swap to Postgres is a data-layer-only change — all SQL lives
  in `src/lib/db/`).
- **No ORM.** ~10 tables; a typed query layer over raw SQL keeps the
  dependency surface small and the SQL honest. TS strict, no `any`.
- **No auth in CORE.** Write flows (register, proof, contact) are open and
  the UI labels new submissions as `self_reported`/unclaimed. Rationale:
  this sprint proves the product model locally; identity/claiming is
  meaningless without real users and was the v2 area with the worst defect
  density (AUDIT #2, #5). Ownership claiming + sessions are the first
  post-sprint feature. **Known issue, recorded in BUILD-REPORT.**
- **No email, no `exec()`, no external sends.** Contact requests persist to
  the DB; notification is a later-phase concern (and the v2 implementation
  was the critical security defect, AUDIT #1).
- Routes render from the DB via server components; **zero mock imports on
  CORE paths** (`src/data/agents.ts` and the adapter layer are deleted).

## 7. CORE scope (committed)

**Routes** (all server-rendered from seeded SQLite):

| Route | Purpose |
|---|---|
| `/` | Landing: positioning, live counts from DB, featured subjects |
| `/agents` | Directory: search + category/platform/tier filters (server-side via querystring) |
| `/agents/[slug]` | Agent profile: identity header, trust tier, provenance-tagged metrics, proof feed, How-it's-built, lineage, team memberships, contact CTA |
| `/teams` | Team/swarm directory |
| `/teams/[slug]` | Team profile: topology diagram (roles), member roster → agent profiles, team metrics + proof feed, How-it's-built, contact CTA |
| `/owners/[handle]` | Owner: identity, roster of agents/teams, contact CTA |
| `/register` | Register an agent (the write wedge) |
| `/trust` | The trust model explained — ladder, provenance tags, what AgentCV does *not* verify. This page is itself positioning. |

**Flows** (each demonstrated end-to-end with persistence proof):

1. Browse → filter directory → open agent profile (read path).
2. Register agent → DB row → new profile renders at `/agents/[new-slug]`.
3. Add proof entry to a profile → DB row → renders in feed; tier recompute
   visible when it crosses the evidence threshold.
4. Contact/connect request on agent, team, or owner → DB row (status
   `pending`) — the AngelList surface and the consulting wedge, neutrally
   framed ("Contact owner", not an AgentLab brochure).
5. Flagship: Ari team profile at `/teams/ari-collective` with real topology
   (Ari orchestrates / Stanley codes / Arthur ops / Laplace audits),
   illustrative data clearly labeled per-entry (`illustrative` flag renders
   a visible marker).

**Out of CORE** (deliberate cuts, revisit post-sprint): auth/claiming,
attestation write-UI, endorsements between agents, template profile pages,
search-as-you-type, API keys/public API, pagination beyond a sane LIMIT,
light mode, mobile nav menu (link row suffices), Framer Motion (dependency
dropped if unused).

## 8. Seed data policy (epistemics in the product)

- Ari, Stanley, Arthur, Laplace + the Ari team: **real topology and roles,
  real lesson content where available; metrics/dates marked
  `illustrative` where I cannot verify them.** The flagship must model the
  honesty the product demands.
- 8–10 additional fictional agents + 2 fictional teams to make directories
  real: plausible, clearly fictional names, all `self_reported` or
  `evidence_linked`-with-fictional-URLs marked `illustrative`.
- **No seeded subject reaches `platform_verified`** — the platform hasn't
  verified anything; the seed must not lie about that.

## 9. Definition of done

Inherited verbatim from the goal: design records (this file, AUDIT.md,
MARKET.md), clean `npm run build` + `npx tsc --noEmit`, every CORE route
rendering real seed data with captures under `docs/evidence/`, every CORE
flow demonstrated with persistence proof, flagship live, README quickstart
≤3 commands verified from a fresh clone, BUILD-REPORT.md with QA checklist.
Final acceptance = independent pass (Laplace/HJ), not my declaration.
