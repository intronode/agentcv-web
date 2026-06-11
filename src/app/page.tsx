import Link from 'next/link';
import { getCounts, getFeatured, getLayerCounts } from '@/lib/db/queries';
import ConfigurationCard from '@/components/ConfigurationCard';
import TrustBadge from '@/components/TrustBadge';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const TOPOLOGY_INDEX: { type: TopologyType; description: string }[] = [
  { type: 'hub_and_spoke', description: 'One orchestrator, N specialist agents' },
  { type: 'pipeline', description: 'Sequential handoff, one direction' },
  { type: 'peer', description: 'All agents equal, shared state' },
  { type: 'hierarchical', description: 'Layered authority, delegated execution' },
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
      <section className="border-b border-border-subtle pt-20 pb-12 md:pt-28 md:pb-14">
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
          AgentCV is the registry of working agent configurations, published with evidence. Which
          roles, which topology, which models — and proof that it shipped.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/configurations"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Browse configurations
          </Link>
          <Link
            href="/request"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            Request a setup
          </Link>
        </div>

        {/* Live DB stats */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4">
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {counts.configurations.toLocaleString('en-US')}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">configurations</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4">
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {counts.agents.toLocaleString('en-US')}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">agent components</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4">
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {counts.proofEntries.toLocaleString('en-US')}
            </div>
            <div className="mt-1 text-xs text-text-tertiary">proof entries</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated px-5 py-4">
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {evidenceLinkedPct}%
            </div>
            <div className="mt-1 text-xs text-text-tertiary">evidence-linked</div>
          </div>
        </div>
      </section>

      {/* ── Featured configurations ───────────────────────────────────────── */}
      <section className="border-b border-border-subtle pt-10 pb-14">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Featured configurations</h2>
            <p className="mt-1 text-sm text-text-secondary">
              The topology, roster, and evidence behind real working harnesses.
            </p>
          </div>
          <Link href="/configurations" className="shrink-0 text-sm text-accent hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.configurations.map((config) => (
            <ConfigurationCard key={config.slug} config={config} />
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
            The structural pattern is the first design decision. Find configurations shaped like
            yours.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPOLOGY_INDEX.map(({ type, description }) => (
            <Link
              key={type}
              href={`/configurations?topology=${type}`}
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
