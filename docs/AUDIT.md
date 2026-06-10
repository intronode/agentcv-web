# AUDIT.md — Sprint 1–5 Codebase Audit & Keep/Scrap Verdicts

> 2026-06-11. Audited by Claude Code (Fable 5) via full-repo read (Explore
> subagent, every source file). This is a record of findings and decisions,
> not an approval request. Verdicts feed SPEC-V3.md.

## 1. What exists (observed)

State as of commit `4cec344` (+ mission-brief commit `61f58f6`):
Next.js 15 / React 19 / Tailwind 4 / TypeScript strict app, ~30 source
files, built across Sprints 1–5 against **Supabase (cloud Postgres + auth)**.

- **Schema** (`docs/schema.sql`): 8 tables — profiles, agents,
  agent_capabilities, agent_metrics, agent_activity, agent_blueprints,
  consulting_requests, endorsements. RLS everywhere. **No team/swarm entity
  anywhere** in schema, types, or UI.
- **Pages**: `/`, `/agents`, `/agents/[slug]`, `/agent/[id]` (duplicate),
  `/discover` (orphaned — not in nav), `/owners/[username]`, `/register`,
  `/about`.
- **APIs**: GET/POST agents, metrics PATCH, activity POST, claim-agent,
  consulting-requests, profile/consulting.
- **Data flow**: every read path tries Supabase, silently falls back to
  hardcoded mock data (`src/data/agents.ts`, 12 fictional agents) when the
  result is empty. Home page never touches the DB at all (mock-only).

## 2. Defects found (observed, with sources)

Severity-ranked. Each was confirmed by file read, not inferred.

| # | Severity | Finding | Source |
|---|----------|---------|--------|
| 1 | Critical | `child_process.exec()` builds a shell command from user-controlled form fields; `sanitize()` escapes only `"` — shell-injectable. Hardcoded absolute path `/Users/aribot/.openclaw/workspace/scripts/send-email.js`; failures swallowed. | `src/app/api/consulting-requests/route.ts:143` |
| 2 | Critical (for this sprint) | App cannot run without cloud env vars: `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` non-null-asserted; server pages throw before mock fallback is reachable. No `.env.example`. | `src/lib/supabase/client.ts:4-5`, `server.ts` |
| 3 | High | Schema/code drift: `Profile.twitter_url`, `ConsultingRequest.budget_range`/`timeline` exist in TS types and are read/inserted by code but **do not exist in schema.sql** — consulting inserts with those fields fail at the DB. | `src/lib/types/database.ts`, `consulting-requests/route.ts:85-86` |
| 4 | High | 3-way activity enum mismatch: schema CHECK vs API allowlist vs form dropdown. `achievement`/`partnership` pass API validation, fail DB constraint. | schema.sql / `activity/route.ts` / `ActivityForm.tsx` |
| 5 | Med | Register API writes the owner's **email** into `owner_title`. Register form silently drops stack + blueprint text before POST. | `register/route.ts:135`, `register/page.tsx:121-134` |
| 6 | Med | API mock fallback assigns `categories: stacks` (wrong list). Sorts `performance`/`popular`/`rated` are all identical (`endorsement_count DESC`). | `api/agents/route.ts:77`, `lib/agents.ts` |
| 7 | Med | Dead/duplicate surface: `/agent/[id]` duplicates `/agents/[slug]`; `/discover` unreachable from nav; `AgentCardSkeleton` never used; mobile nav button has no onClick; no root `middleware.ts` so auth refresh never runs. | various |
| 8 | Low | No `loading.tsx`/`error.tsx` anywhere; Google Fonts CDN dependency; `not-found.tsx` hardcodes hex instead of tokens. | `src/app/` |

## 3. What is genuinely good (observed)

- **Design-token system**: `globals.css` `@theme` block (surface/border/text
  tokens, accent blue, forced dark `color-scheme`) — used consistently via
  Tailwind classes across every component. This is the "Linear/Vercel" feel
  already working.
- **AgentCard** visual design: avatar + badge + tagline + metrics row.
  Pure-display, no data coupling. Worth carrying forward.
- **VerificationBadge** tier component (4 tiers, tooltips, size variants) —
  the component pattern is good even though the v2 tier semantics are not
  (see SPEC-V3 trust ladder).
- The **profile-tab structure** (about / capabilities / track-record /
  blueprints / activity) in `AgentProfileClient` is a sane information
  architecture starting point.
- TS strict config, prettier, husky pre-commit — keep.

## 4. Verdicts

| Asset | Verdict | Reason |
|---|---|---|
| Supabase layer (`src/lib/supabase/*`, all auth, RLS schema) | **Scrap** | Violates this sprint's zero-credential local constraint; the auth model (Supabase users) doesn't fit v3 anyway. |
| Mock-fallback architecture (`src/data/agents.ts`, `agent-adapters.ts`) | **Scrap** | Silent mock substitution is the opposite of a proof/trust product. v3: one real local DB, seeded, no mock imports on any CORE path. |
| `docs/schema.sql` / `seed.sql` (v2 Postgres) | **Scrap** (keep in git history as reference) | No team entity, fixed-column metrics can't carry per-metric provenance, drifted from code. |
| `/agent/[id]`, `/discover` | **Scrap** | Duplicate/orphaned. One directory (`/agents`), one detail route. |
| Consulting email route (`exec()`) | **Scrap** | Security defect #1; local-only sprint sends no email. Replaced by DB-persisted contact requests. |
| `PRODUCT-SPEC-V2.md` | **Supersede** | Replaced by SPEC-V3.md; file deleted from working tree (git history preserves it). |
| Design tokens / `globals.css` | **Keep** (extend) | Already the right aesthetic. |
| AgentCard, VerificationBadge, Navbar shell, profile-tab IA | **Keep as design reference, reimplement** | Carried into v3 components against the new model; v2 props/types don't survive. |
| TS strict + prettier + husky | **Keep** | Working; quality bar requires it. |
| Next.js 15 / React 19 / Tailwind 4 stack | **Keep** | No reason to churn; meets the bar. |
| Verification-ladder *concept* | **Keep, redesign semantics** | v2 ladder implied platform verification that doesn't exist; v3 replaces it with a provenance-honest trust ladder (SPEC-V3 §4). |

## 5. What's NOT in this audit

- No runtime reproduction of the Supabase-coupled flows (no cloud creds on
  this machine, and the verdict to scrap doesn't depend on running them).
- No git-history archaeology beyond the commit list; sprint-era docs treated
  as reference per CLAUDE.md.
- No dependency CVE scan of node_modules.
- Market findings live in MARKET.md, product decisions in SPEC-V3.md.
