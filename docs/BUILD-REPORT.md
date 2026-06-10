# BUILD-REPORT.md — AgentCV v3 Sprint

> 2026-06-11, Claude Code (Fable 5). States what was shipped and what I
> verified and how. **Final acceptance is the independent pass (Laplace or
> HJ), not this report.**

## Shipped vs CORE (SPEC-V3 §7)

| CORE item | Status | Evidence |
|---|---|---|
| 8 routes (`/`, `/agents`, `/agents/[slug]`, `/teams`, `/teams/[slug]`, `/owners/[handle]`, `/register`, `/trust`) | Shipped, all HTTP 200 with real seed data | `docs/evidence/routes/*.html` (12 captures incl. filter & lineage variants), 404 handling verified |
| Build + typecheck clean | `npm run build` exit 0, `npx tsc --noEmit` exit 0, zero errors | `docs/evidence/00-build-and-typecheck.txt` |
| Flow: register agent → DB row → profile renders | Verified (201 → `agents` row id 13 → route renders) | `docs/evidence/flows/01-register-agent.txt` |
| Flow: proof entries upgrade computed tier | Verified — tier flipped `self_reported → evidence_linked` exactly at the 3rd evidence entry | `docs/evidence/flows/02-proof-tier-upgrade.txt` |
| Flow: contact request persists | Verified (201 → `contact_requests` row, status `pending`) | `docs/evidence/flows/03-contact-request.txt` |
| Input validation | Verified (400 on bad enum/email, 404 on unknown subject) | `docs/evidence/flows/04-validation.txt` |
| API read round-trip with tier filter | Verified | `docs/evidence/flows/05-api-read.txt` |
| Flagship: Ari Collective with real topology | Shipped at `/teams/ari-collective`; real roles/lessons, invented data marked `illustrative` per row | `docs/evidence/routes/team-ari-collective.html` |
| No mock imports on CORE paths | Verified — `grep -r "data/agents\|supabase" src` returns nothing; v2 mock layer deleted | grep output in session; files removed in commit history |
| README quickstart ≤3 commands | Shipped; fresh-clone verification recorded below | `docs/evidence/06-fresh-clone.txt` |

## Deliberate cuts (and why)

- **Auth / ownership claiming** — meaningless without real users; was v2's
  worst defect cluster. Write flows are open and label everything
  self-reported. First post-sprint feature.
- **Attestation write-UI** — attestations render (they gate `peer_attested`)
  but are seeded/DB-inserted only; a public "attest" form without identity
  would be fake trust.
- **Template profile pages** — lineage fields (`original/fork/instance` +
  parent link) capture the founding template/instance insight; separate
  template pages drift toward catalog shape. Revisit with real registrations.
- **Email/notifications on contact requests** — local-only sprint; v2's email
  path was also the critical `exec()` security defect. Requests persist with
  status `pending`.
- **Endorsements between agents, search-as-you-type, pagination beyond
  LIMIT 100, light mode, Framer Motion** — not needed to prove the model.

## Known issues / honest notes

1. **Open writes.** Anyone can register agents, add proof to *any* profile,
   and create contact requests. Acceptable for a local demo; must not deploy
   as-is. (Recorded in SPEC-V3 §6.)
2. **`platform_verified` is designed, not implemented** — by intent; no
   profile can reach it. The `/trust` page says so publicly.
3. **better-sqlite3 is a native module** — pins deploys to Node runtimes
   (no Edge). Deployment is a later phase; the SQL layer is isolated in
   `src/lib/db/` for a Postgres swap.
4. **Stale `.env.local`** with sprint-era Supabase keys still sits untracked
   in the working dir. Nothing reads it anymore. HJ should delete it (and
   consider rotating those keys since they were cloud credentials).
5. **Husky pre-commit** remains active (prettier on staged files) — kept per
   constraint.
6. **Commits are local-only**; nothing pushed this sprint (conservative
   reading of "local development only"). `origin/main` is 2 commits behind
   local plus this sprint's work.
7. **Visual QA was done via rendered-HTML inspection, not a browser** — the
   independent reviewer's browser pass is the real visual check (checklist
   below).

## [[NEEDS CONFIRMATION: …]] items for HJ

- [[NEEDS CONFIRMATION: operational-since dates for Ari/Stanley/Arthur/
  Laplace and the Collective — left NULL rather than guessed]]
- [[NEEDS CONFIRMATION: Ari team metrics (tasks completed, success rate,
  cost/task) — seeded values are marked illustrative; replace with real
  numbers if you want the flagship fully evidence-grade]]
- [[NEEDS CONFIRMATION: whether sprint-attribution "Stanley implemented
  Sprints 1–5" is accurate — marked illustrative in seed]]
- [[NEEDS CONFIRMATION: HJ owner-profile bio wording — kept minimal, no
  personal info, no company branding]]

## QA checklist (≤15 min, independent reviewer)

Setup (2 min): `git clone <repo> && cd agentcv-web && npm install && npm run dev`
→ http://localhost:3000. No env vars. If the DB ever looks wrong: `npm run db:reset`.

1. **Home** renders counts (13 agents / 3 teams after the evidence run; 12/3
   after `db:reset`) and featured cards. (1 min)
2. **/agents**: search "haven" → 1 result; tier filter "Peer-Attested" → only
   CodePilot CR; clear filters. (2 min)
3. **/agents/ari**: trust badge reads Self-Reported (honest — Ari has <3
   evidence links); orange illustrative banner present; "Member of" links to
   the Collective. (1 min)
4. **/teams/ari-collective**: 4 members with roles (Ari Orchestrator /
   Stanley Engineer / Arthur Operations / Laplace Auditor); proof feed shows
   the husky incident with a real GitHub commit link; badge = Evidence-Linked;
   metrics carry `self-reported` + `illustrative` tags. (3 min)
5. **Register flow**: /register → submit a test agent → redirected to its
   profile at Self-Reported. (2 min)
6. **Proof flow**: on that profile, "+ Add proof entry" 3× with any
   https://example.com URL → after the 3rd, notice reports tier
   `evidence_linked` and the header badge updates on refresh. (3 min)
7. **Contact flow**: any profile → Contact owner → submit → success shows a
   request id; verify with
   `sqlite3 data/agentcv.db "SELECT * FROM contact_requests;"`. (2 min)
8. **/trust** reads coherently and `platform_verified` is described as not
   yet granted. (1 min)

Pass = all 8 behave as described. The evidence files in `docs/evidence/`
show the same checks performed on 2026-06-11.
