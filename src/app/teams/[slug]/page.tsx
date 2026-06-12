import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTeamProfile } from '@/lib/db/queries';
import TrustBadge from '@/components/TrustBadge';
import LayerLabel from '@/components/LayerLabel';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import MetricGrid from '@/components/MetricGrid';
import ProofFeed from '@/components/ProofFeed';
import ProofForm from '@/components/ProofForm';
import AttestationList from '@/components/AttestationList';
import AttestationForm from '@/components/AttestationForm';
import ContactForm from '@/components/ContactForm';
import { formatDate, formatMetricValue } from '@/lib/format';
import type { TopologyType, MetricRow } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getTeamProfile(slug);
  if (!profile) return { title: 'Team — AgentCV' };
  return {
    title: `${profile.team.name} — AgentCV`,
    description: profile.team.tagline,
  };
}

/** Token-economics metrics: cost keys are special-cased for the economics subsection. */
const COST_KEYS = ['cost_per_task_usd', 'cost_per_month_usd'];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight text-text-primary">{children}</h2>;
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-border-subtle last:border-0">
      <dt className="shrink-0 text-xs text-text-tertiary">{label}</dt>
      <dd className="text-right text-sm text-text-secondary">{children}</dd>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-text-tertiary">[unknown]</span>;
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-surface px-1.5 py-px text-[10px] font-medium text-text-tertiary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function TokenEconomicsSection({ metrics }: { metrics: MetricRow[] }) {
  const costMetrics = metrics.filter((m) => COST_KEYS.includes(m.key));
  return (
    <section>
      <SectionHeading>Token economics</SectionHeading>
      <p className="mt-1 text-xs text-text-tertiary">
        Cost transparency is part of the honesty architecture.{' '}
        <span className="text-text-tertiary/70">
          [unknown] means it was not tracked — not that it is zero.
        </span>
      </p>
      {costMetrics.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-5 text-sm text-text-tertiary">
          No cost metrics on record.{' '}
          <span className="text-text-tertiary/70">
            Cost tracking is hard across runtimes; honest absence beats invented figures.
          </span>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {costMetrics.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-surface-elevated p-4">
              <div className="text-xs text-text-tertiary">{m.label}</div>
              <div
                className={`mt-1 text-xl font-semibold tracking-tight ${
                  m.value === null ? 'text-text-tertiary' : 'text-text-primary'
                }`}
              >
                {formatMetricValue(m.value, m.unit)}
              </div>
              {m.note && (
                <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">{m.note}</p>
              )}
              <div className="mt-1.5 text-[10px] text-text-tertiary">
                as of {formatDate(m.as_of)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getTeamProfile(slug);
  if (!profile) notFound();

  const { team, owner, tier, members, metrics, proof, attestations } = profile;

  const topologyType = team.topology_type as TopologyType | null;
  const industries: string[] = team.industries ? (JSON.parse(team.industries) as string[]) : [];
  const taskKinds: string[] = team.task_kinds ? (JSON.parse(team.task_kinds) as string[]) : [];
  const performanceMetrics = metrics.filter((m) => !COST_KEYS.includes(m.key));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-start gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-4xl">
          {team.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <TrustBadge tier={tier} size="md" />
            <LayerLabel
              layer={team.seed_layer}
              sourceUrl={team.source_url}
              sourceName={team.source_name}
              size="md"
            />
          </div>
          <p className="mt-2 max-w-2xl text-text-secondary">{team.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <Link href={`/owners/${owner.handle}`} className="text-accent hover:underline">
              {owner.display_name}
            </Link>
            {team.operational_since && (
              <span className="text-text-tertiary">
                · Operating since {formatDate(team.operational_since)}
              </span>
            )}
            <span className="text-text-tertiary">· {team.status}</span>
          </div>
        </div>
      </header>

      {/* Curated source notice */}
      {team.seed_layer === 'curated' && team.source_name && (
        <div className="mt-5 rounded-lg border border-blue-400/20 bg-blue-500/5 px-4 py-3 text-xs leading-relaxed text-blue-200">
          Curated from{' '}
          {team.source_url ? (
            <a
              href={team.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 hover:text-blue-100"
            >
              {team.source_name}
            </a>
          ) : (
            <span className="font-medium">{team.source_name}</span>
          )}{' '}
          — not claimed by or endorsed by the organization. Metrics cited only as the source states.
          Absent metrics render as [unknown].
        </div>
      )}

      {/* Illustrative notice */}
      {team.seed_layer === 'illustrative' && (
        <div className="mt-5 rounded-lg border border-dashed border-orange-400/40 bg-orange-500/5 px-4 py-3 text-xs leading-relaxed text-orange-200">
          This team is illustrative — clearly labeled demo content, not a claim to a real
          deployment. Used to demonstrate breadth of industry coverage. Never counted in the real or
          curated totals.
        </div>
      )}

      {/* ── Main layout: content + sidebar ── */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-12">
          {/* 1. Comparable-fields spec sheet */}
          <section>
            <SectionHeading>Spec sheet</SectionHeading>
            <p className="mt-1 text-xs text-text-tertiary">
              The benchmark fields — designed for comparison across teams.
            </p>
            <dl className="mt-4 rounded-xl border border-border bg-surface-elevated px-5 py-1">
              {topologyType && (
                <SpecRow label="Topology">
                  <span className="inline-flex items-center gap-1.5">
                    <TopologyGlyph topology={topologyType} size={14} className="text-accent" />
                    {TOPOLOGY_LABELS[topologyType]}
                  </span>
                </SpecRow>
              )}
              {team.agent_count !== null && (
                <SpecRow label="Agent count">
                  <span className="font-medium text-text-primary">{team.agent_count}</span>
                </SpecRow>
              )}
              {team.platform && <SpecRow label="Platform">{team.platform}</SpecRow>}
              <SpecRow label="Industries">
                <TagList items={industries} />
              </SpecRow>
              <SpecRow label="Task kinds">
                <TagList items={taskKinds} />
              </SpecRow>
              <SpecRow label="Trust tier">
                <TrustBadge tier={tier} size="sm" />
              </SpecRow>
              <SpecRow label="Proof entries">
                <span className="font-medium text-text-primary">{proof.length}</span>
              </SpecRow>
            </dl>
          </section>

          {/* 2. Topology & roster */}
          <section>
            <SectionHeading>Topology &amp; roster</SectionHeading>
            {topologyType && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3">
                <TopologyGlyph topology={topologyType} size={40} className="shrink-0 text-accent" />
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {TOPOLOGY_LABELS[topologyType]}
                  </div>
                  {team.topology && (
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                      {team.topology}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <Link
                  key={member.slug}
                  href={`/agents/${member.slug}`}
                  className="group block min-w-0 w-full rounded-xl border border-border bg-surface-elevated p-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-xl">
                      {member.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-text-primary transition-colors group-hover:text-accent">
                          {member.name}
                        </span>
                        <span className="rounded bg-accent/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-accent">
                          {member.role}
                        </span>
                      </div>
                      {member.model && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">{member.model}</p>
                      )}
                      {member.roleDetail && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">
                          {member.roleDetail}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 3. Performance metrics */}
          <section>
            <SectionHeading>Performance metrics</SectionHeading>
            <p className="mt-1 text-xs text-text-tertiary">
              Windowed metrics with provenance. [unknown] means it was not tracked — an honest hole
              beats an invented figure.
            </p>
            <div className="mt-3">
              <MetricGrid metrics={performanceMetrics} />
            </div>
          </section>

          {/* 4. Token economics */}
          <TokenEconomicsSection metrics={metrics} />

          {/* 5. Blueprint */}
          {(team.why_it_works || team.how_built || team.oversight) && (
            <section>
              <SectionHeading>Blueprint</SectionHeading>
              <p className="mt-1 text-xs text-text-tertiary">
                Operational DNA — why it works, how it was built, and how it is overseen. Not files
                for sale; knowledge of the design.
              </p>
              <div className="mt-4 space-y-3">
                {team.why_it_works && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      Why it works
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {team.why_it_works}
                    </p>
                  </div>
                )}
                {team.how_built && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      How it was built
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {team.how_built}
                    </p>
                  </div>
                )}
                {team.oversight && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      Oversight model
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {team.oversight}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 6. Proof feed */}
          <section>
            <SectionHeading>
              Proof <span className="text-sm font-normal text-text-tertiary">({proof.length})</span>
            </SectionHeading>
            <p className="mt-1 text-xs text-text-tertiary">
              The team&apos;s shared track record — tasks, incidents, lessons, milestones. Per-entry
              provenance tags are always visible.
            </p>
            <div className="mt-5">
              <ProofFeed entries={proof} />
            </div>
            <div className="mt-5">
              <ProofForm subjectType="team" subjectSlug={team.slug} />
            </div>
            {/* Next-steps guidance — shown only on fresh profiles with no evidence yet */}
            {proof.length === 0 && metrics.length === 0 && (
              <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
                <p className="text-sm font-semibold text-text-primary">
                  Build this profile&apos;s evidence
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Self-Reported is the honest starting tier. The computed tier upgrades
                  automatically as you add evidence.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">→</span>
                    <span>
                      <a href="#proof" className="font-medium text-accent hover:underline">
                        Add a proof entry
                      </a>{' '}
                      — tasks, incidents, lessons, milestones, or artifacts with an evidence URL
                      upgrade the tier to Evidence-Linked.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">→</span>
                    <span>
                      Request attestations from colleagues with first-hand experience — required for
                      Peer-Attested.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">→</span>
                    <span>
                      The tier upgrades automatically at 3 evidence-linked entries. Nothing here is
                      self-assignable.
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </section>

          {/* 7. Attestations */}
          <section>
            <SectionHeading>
              Attestations{' '}
              <span className="text-sm font-normal text-text-tertiary">
                ({attestations.length})
              </span>
            </SectionHeading>
            <p className="mt-1 text-xs text-text-tertiary">
              Named third-party statements from people with first-hand experience. Attestations are
              what separates Peer-Attested from Evidence-Linked.
            </p>
            <div className="mt-4">
              <AttestationList attestations={attestations} />
            </div>
            <div className="mt-4">
              <AttestationForm
                subjectType="team"
                subjectSlug={team.slug}
                subjectLabel="team"
                evidenceCount={proof.filter((p) => p.evidence_url !== null).length}
              />
            </div>
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-5">
          {/* CTAs */}
          <div className="space-y-2">
            <Link
              href={`/request?config=${team.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-button px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12A19.79 19.79 0 0 1 1.07 3.18 2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.34 1.85.573 2.81.7A2 2 0 0 1 21 16h1z" />
              </svg>
              Request this setup
            </Link>
            <Link
              href={`/compare?ids=${team.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              Compare
            </Link>
          </div>

          {/* Facts panel */}
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Quick facts
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-text-tertiary">Owner</dt>
                <dd>
                  <Link href={`/owners/${owner.handle}`} className="text-accent hover:underline">
                    {owner.display_name}
                  </Link>
                </dd>
              </div>
              {topologyType && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-tertiary">Topology</dt>
                  <dd className="inline-flex items-center gap-1 text-text-secondary">
                    <TopologyGlyph topology={topologyType} size={13} className="text-accent" />
                    {TOPOLOGY_LABELS[topologyType]}
                  </dd>
                </div>
              )}
              {team.agent_count !== null && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-tertiary">Agents</dt>
                  <dd className="text-text-secondary">{team.agent_count}</dd>
                </div>
              )}
              {team.platform && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-tertiary">Platform</dt>
                  <dd className="text-text-secondary">{team.platform}</dd>
                </div>
              )}
              {team.operational_since && (
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-text-tertiary">Operating since</dt>
                  <dd className="text-text-secondary">{formatDate(team.operational_since)}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <dt className="text-text-tertiary">Status</dt>
                <dd className="text-text-secondary capitalize">{team.status}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-text-tertiary">Layer</dt>
                <dd>
                  <LayerLabel
                    layer={team.seed_layer}
                    sourceUrl={team.source_url}
                    sourceName={team.source_name}
                    size="sm"
                  />
                </dd>
              </div>
            </dl>
          </div>

          {/* Contact form */}
          <ContactForm subjectType="team" subjectSlug={team.slug} subjectName={team.name} />

          {/* Back to directory */}
          <Link
            href="/teams"
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            All teams
          </Link>
        </aside>
      </div>
    </div>
  );
}
