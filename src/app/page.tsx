import Link from 'next/link';
import { getCounts, getFeatured, getLayerCounts } from '@/lib/db/queries';
import TeamCard from '@/components/TeamCard';
import TrustBadge from '@/components/TrustBadge';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const TOPOLOGY_INDEX: { type: TopologyType; description: string }[] = [
  { type: 'orchestrator_worker', description: 'One orchestrator, N specialist agents' },
  { type: 'supervisor', description: 'Supervisor routes tasks to sub-agents' },
  { type: 'swarm', description: 'Distributed agents, emergent coordination' },
  { type: 'pipeline', description: 'Sequential handoff, one direction' },
  { type: 'router', description: 'Single entry-point routes to specialists' },
  { type: 'solo_plus_tools', description: 'Single agent, rich tool surface' },
  { type: 'other', description: 'Custom or hybrid topology' },
];

export default function HomePage() {
  const counts = getCounts();
  const featured = getFeatured();
  const layers = getLayerCounts();

  const evidenceLinkedPct =
    counts.proofEntries > 0 ? Math.round((layers.evidenceLinked / counts.proofEntries) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-border-subtle pt-12 pb-12 md:pt-16 md:pb-14">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          {/* ── Left column: copy + CTAs + stats ── */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              Harness Engineering Registry
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight md:text-[3.25rem]">
              Agent = Model + Harness.{' '}
              <span className="text-text-secondary">
                The model is rented. The harness is the asset.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary">
              AgentCV is the registry of working agent teams, published with evidence. Which roles,
              which topology, which models — and proof that it shipped.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/teams"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Browse teams
              </Link>
              <Link
                href="/request"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                Request a setup
              </Link>
            </div>

            {/* Live DB stats — 2×2 at mobile fold, 4-col on larger viewports */}
            <div className="mt-8 flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              live from the registry
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 sm:px-5">
                <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {counts.teams.toLocaleString('en-US')}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">teams</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 sm:px-5">
                <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {counts.agents.toLocaleString('en-US')}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">agent components</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 sm:px-5">
                <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {counts.proofEntries.toLocaleString('en-US')}
                </div>
                <div className="mt-1 text-xs text-text-tertiary">proof entries</div>
              </div>
              <div className="rounded-xl border border-border bg-surface-elevated px-4 py-4 sm:px-5">
                <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {evidenceLinkedPct}%
                </div>
                <div className="mt-1 text-xs text-text-tertiary">evidence-linked</div>
              </div>
            </div>
          </div>

          {/* ── Right column: live registry preview — flagship card over topology glyph backdrop ── */}
          {/* Hidden below lg to prevent layout collapse; stacks above on small screens if flagship exists */}
          {featured.teams[0] && (
            <div className="hidden lg:flex lg:w-[360px] lg:shrink-0 lg:flex-col lg:items-stretch">
              <div className="relative">
                {/* Faint orchestrator-worker constellation backdrop */}
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full text-accent/[0.07]"
                  viewBox="0 0 360 340"
                  fill="none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Central hub */}
                  <circle cx="180" cy="170" r="22" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="180" cy="170" r="8" fill="currentColor" opacity="0.4" />
                  {/* Spokes to satellite nodes */}
                  <line x1="180" y1="148" x2="180" y2="68" stroke="currentColor" strokeWidth="1" />
                  <line x1="199" y1="179" x2="292" y2="210" stroke="currentColor" strokeWidth="1" />
                  <line x1="163" y1="182" x2="76" y2="240" stroke="currentColor" strokeWidth="1" />
                  <line x1="175" y1="192" x2="148" y2="278" stroke="currentColor" strokeWidth="1" />
                  <line x1="197" y1="162" x2="270" y2="90" stroke="currentColor" strokeWidth="1" />
                  {/* Satellite nodes */}
                  <circle cx="180" cy="58" r="10" stroke="currentColor" strokeWidth="1" />
                  <circle cx="302" cy="216" r="10" stroke="currentColor" strokeWidth="1" />
                  <circle cx="66" cy="248" r="10" stroke="currentColor" strokeWidth="1" />
                  <circle
                    cx="140"
                    cy="288"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                  <circle
                    cx="278"
                    cy="80"
                    r="8"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                  {/* Outer ring hints */}
                  <circle
                    cx="180"
                    cy="170"
                    r="90"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="3 6"
                    opacity="0.5"
                  />
                </svg>

                {/* Flagship team card — slightly elevated and rotated */}
                <div
                  className="relative z-10 -rotate-1 rounded-2xl border border-border bg-surface-elevated shadow-xl shadow-black/30"
                  style={{ transform: 'rotate(-1.5deg) translateY(-2px)' }}
                >
                  {/* Card inner content — compact variant of TeamCard */}
                  <Link
                    href={`/teams/${featured.teams[0].slug}`}
                    className="block rounded-2xl p-5 transition-all hover:bg-surface-hover"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
                          {featured.teams[0].avatar}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-text-primary">
                            {featured.teams[0].name}
                          </h3>
                          <p className="text-xs text-text-tertiary">
                            {featured.teams[0].ownerName}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <TrustBadge tier={featured.teams[0].tier} size="sm" />
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                      {featured.teams[0].tagline}
                    </p>

                    {/* Spec row */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-3">
                      {featured.teams[0].topologyType && (
                        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                          <TopologyGlyph
                            topology={featured.teams[0].topologyType}
                            size={13}
                            className="shrink-0 text-accent"
                          />
                          {TOPOLOGY_LABELS[featured.teams[0].topologyType]}
                        </span>
                      )}
                      {featured.teams[0].agentCount !== null && (
                        <span className="text-xs text-text-secondary">
                          <span className="font-medium text-text-primary">
                            {featured.teams[0].agentCount}
                          </span>{' '}
                          agents
                        </span>
                      )}
                      {featured.teams[0].platform && (
                        <span className="text-xs text-text-tertiary">
                          {featured.teams[0].platform}
                        </span>
                      )}
                    </div>

                    {/* Role pills */}
                    {featured.teams[0].members.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {featured.teams[0].members.slice(0, 4).map((member) => (
                          <span
                            key={member.slug}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary"
                          >
                            <span className="font-medium text-text-primary">{member.role}</span>
                            {member.model && (
                              <span className="text-text-tertiary">· {member.model}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </div>

                {/* "live from the registry" caption */}
                <p className="mt-3 text-center text-[11px] text-text-tertiary">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    live from the registry
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Featured teams ───────────────────────────────────────── */}
      <section className="border-b border-border-subtle pt-10 pb-14">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Featured teams</h2>
            <p className="mt-1 text-sm text-text-secondary">
              The topology, roster, and evidence behind real working harnesses.
            </p>
          </div>
          <Link href="/teams" className="shrink-0 text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.teams.map((team) => (
            <div key={team.slug} className="min-w-0">
              <TeamCard team={team} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Three layers of honesty ───────────────────────────────────────── */}
      <section className="border-b border-border-subtle py-14">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight">Three layers of honesty</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Every entry is labeled at the claim level. Provenance is a product feature, not a
            disclaimer.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {/* REAL */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="4" r="4" />
                </svg>
                real
              </span>
              <span className="text-2xl font-bold tabular-nums text-emerald-300">
                {layers.real}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-text-primary">Real</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              Published by the owner from first-hand operating records. Dates, costs, and outcomes
              are as-stated from direct logs.
            </p>
          </div>
          {/* CURATED */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-300">
                <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
                  <circle cx="4" cy="4" r="4" />
                </svg>
                curated
              </span>
              <span className="text-2xl font-bold tabular-nums text-blue-300">
                {layers.curated}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-text-primary">Curated</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              Documented from cited public sources — papers, repos, official announcements. Source
              URL is required. Nothing is invented.
            </p>
          </div>
          {/* ILLUSTRATIVE */}
          <div className="rounded-xl border border-dashed border-orange-400/40 bg-orange-500/5 p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-orange-400/50 bg-orange-500/5 px-2 py-0.5 text-xs font-medium text-orange-300">
                <svg
                  width="7"
                  height="7"
                  viewBox="0 0 8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="4" cy="4" r="3" />
                </svg>
                illustrative
              </span>
              <span className="text-2xl font-bold tabular-nums text-orange-300">
                {layers.illustrative}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-text-primary">Illustrative</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              Demo data showing what the format looks like when real data is absent. Clearly labeled
              at every entry — never mixed with real claims.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust-tier ladder ─────────────────────────────────────────────── */}
      <section className="border-b border-border-subtle py-14">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight">Trust tiers</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Computed from evidence on record, never self-assigned. No badge-buying.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {(
            [
              {
                tier: 'self_reported' as const,
                note: 'Claims stated by the owner. No external evidence on record yet.',
              },
              {
                tier: 'evidence_linked' as const,
                note: '3+ proof entries link to public artifacts any reader can inspect.',
              },
              {
                tier: 'peer_attested' as const,
                note: 'Evidence-linked, plus named third parties have attested directly.',
              },
              {
                tier: 'platform_verified' as const,
                note: 'Not yet granted to anyone — by design. The standard is set, the bar is high.',
              },
            ] as const
          ).map(({ tier, note }) => (
            <div key={tier} className="rounded-xl border border-border bg-surface-elevated p-5">
              <TrustBadge tier={tier} size="sm" />
              <p className="mt-3 text-xs leading-relaxed text-text-tertiary">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Topology index ────────────────────────────────────────────────── */}
      <section className="border-b border-border-subtle py-14">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight">Browse by topology</h2>
          <p className="mt-1 text-sm text-text-secondary">
            The structural pattern is the first design decision. Find teams shaped like yours.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPOLOGY_INDEX.map(({ type, description }) => (
            <Link
              key={type}
              href={`/teams?topology=${type}`}
              className="group flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4 transition-all hover:border-accent/40 hover:bg-surface-hover"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center opacity-70 transition-opacity group-hover:opacity-100">
                <TopologyGlyph topology={type} size={32} />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-text-primary transition-colors group-hover:text-accent">
                  {TOPOLOGY_LABELS[type]}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-text-tertiary">{description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="rounded-2xl border border-border bg-surface-elevated p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
            The discipline
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            What is harness engineering?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Harness engineering — the systematic design of how model, tools, memory, and agent roles
            are composed — is where most of the performance leverage lives. LangChain moved from
            30th to 5th on Terminal Bench through harness changes alone. The explainer is coming.
          </p>
          <Link
            href="/harness-engineering"
            className="mt-6 inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            What is harness engineering? →
          </Link>
        </div>
      </section>
    </div>
  );
}
