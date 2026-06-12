import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import {
  getAgentProfile,
  getConfigurationHeadlineMetrics,
  getTeamTiers,
  getFilesForSubject,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db';
import type { MetricRow } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import LayerLabel from '@/components/LayerLabel';
import { IllustrativeMark, ProvenanceTag } from '@/components/ProvenanceTag';
import MetricGrid from '@/components/MetricGrid';
import ProofFeed from '@/components/ProofFeed';
import ProofForm from '@/components/ProofForm';
import AttestationList from '@/components/AttestationList';
import AttestationForm from '@/components/AttestationForm';
import ContactForm from '@/components/ContactForm';
import { formatDate, formatMetricValue } from '@/lib/format';

type ConfigHeadlineMetric = MetricRow & { configName: string };

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getAgentProfile(slug);
  return { title: profile ? `${profile.agent.name} — AgentCV` : 'Agent — AgentCV' };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getAgentProfile(slug);
  if (!profile) notFound();
  const {
    agent,
    owner,
    tier,
    metrics,
    proof,
    capabilities,
    attestations,
    configurations: teams,
    lineageParent,
    lineageChildren,
  } = profile;

  // For agents with no agent-level metrics, fetch headline metrics from their
  // parent configurations so the empty state can surface them honestly.
  const configHeadlineMetrics: Map<string, ConfigHeadlineMetric> =
    metrics.length === 0 && teams.length > 0
      ? (getConfigurationHeadlineMetrics(teams.map((t) => t.slug)) as Map<
          string,
          ConfigHeadlineMetric
        >)
      : new Map();

  // Fetch team tiers to show context when agent's tier < team's tier.
  const teamTiers: Map<string, string> =
    teams.length > 0 ? (getTeamTiers(teams.map((t) => t.slug)) as Map<string, string>) : new Map();

  // Tier rank for comparison: higher index = higher tier
  const TIER_RANK: Record<string, number> = {
    self_reported: 0,
    evidence_linked: 1,
    peer_attested: 2,
    platform_verified: 3,
  };
  const agentTierRank = TIER_RANK[tier] ?? 0;

  // Files — show public files to everyone; show private files only to owner
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const db = getDb();
  const ownerRow = db.prepare('SELECT user_id FROM owners WHERE id=?').get(owner.id) as
    | { user_id: number | null }
    | undefined;
  const isOwner = userId !== null && ownerRow?.user_id === userId;
  const files = isOwner
    ? getFilesForSubject('agent', agent.id, false)
    : getFilesForSubject('agent', agent.id, true);

  // Collect teams whose tier is strictly higher than the agent's tier
  const higherTierTeams = teams.filter((t) => {
    const teamTier = teamTiers.get(t.slug);
    return teamTier !== undefined && (TIER_RANK[teamTier] ?? 0) > agentTierRank;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <header className="flex flex-wrap items-start gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-4xl">
          {agent.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
            <TrustBadge tier={tier} size="md" />
            <LayerLabel
              layer={agent.seed_layer}
              sourceUrl={agent.source_url ?? undefined}
              size="md"
            />
            {agent.status !== 'active' && (
              <span className="rounded border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                {agent.status}
              </span>
            )}
          </div>
          {higherTierTeams.length > 0 && (
            <p className="mt-1 text-xs text-text-tertiary">
              Tiers are computed per subject —{' '}
              {higherTierTeams.map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && <span>, </span>}
                  <Link href={`/teams/${t.slug}`} className="text-accent hover:underline">
                    {t.name}
                  </Link>{' '}
                  is{' '}
                  <span className="font-medium text-text-secondary">
                    {teamTiers.get(t.slug)!.replace(/_/g, ' ')}
                  </span>
                </span>
              ))}{' '}
              on its own evidence.
            </p>
          )}
          <p className="mt-1.5 max-w-2xl text-text-secondary">{agent.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/owners/${owner.handle}`} className="text-accent hover:underline">
              {owner.display_name}
            </Link>
            <span className="text-text-tertiary">·</span>
            <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-text-secondary">
              {agent.category}
            </span>
            <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-text-tertiary">
              {agent.platform}
            </span>
            {agent.model && (
              <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-text-tertiary">
                {agent.model}
              </span>
            )}
            {agent.lineage_kind !== 'original' && lineageParent && (
              <span className="text-text-tertiary">
                {agent.lineage_kind} of{' '}
                <Link
                  href={`/agents/${lineageParent.slug}`}
                  className="text-accent hover:underline"
                >
                  {lineageParent.name}
                </Link>
              </span>
            )}
          </div>
        </div>
      </header>

      {agent.seed_layer === 'illustrative' && (
        <p className="mt-6 rounded-lg border border-dashed border-orange-400/40 bg-orange-500/5 px-4 py-3 text-xs leading-relaxed text-orange-200">
          Parts of this profile are illustrative — demo or approximate data, marked entry-by-entry.
          Unmarked entries are real.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {agent.about && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">About</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {agent.about}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Metrics</h2>
            <div className="mt-3">
              {metrics.length > 0 ? (
                <MetricGrid metrics={metrics} />
              ) : teams.length > 0 ? (
                <div className="rounded-lg border border-border bg-surface-elevated/50 p-5">
                  <p className="text-sm leading-relaxed text-text-secondary">
                    Performance is measured where the work happens — at the team level. {agent.name}{' '}
                    runs inside{' '}
                    {teams.length === 1 && teams[0] ? (
                      <Link
                        href={`/teams/${teams[0].slug}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {teams[0].avatar} {teams[0].name}
                      </Link>
                    ) : (
                      'the teams below'
                    )}
                    , whose windowed metrics are the honest unit of account.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {teams.map((team) => {
                      const headline: ConfigHeadlineMetric | undefined = configHeadlineMetrics.get(
                        team.slug
                      );
                      return (
                        <li key={team.slug} className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/teams/${team.slug}`}
                            className="text-sm font-medium text-accent hover:underline"
                          >
                            {team.avatar} {team.name}
                          </Link>
                          {headline && headline.value !== null && (
                            <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-elevated px-2 py-0.5 text-xs">
                              <span className="text-text-tertiary">{headline.label}:</span>
                              <span className="font-semibold text-text-primary">
                                {formatMetricValue(headline.value, headline.unit)}
                              </span>
                              <ProvenanceTag provenance={headline.provenance} />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <MetricGrid metrics={[]} />
              )}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Proof{' '}
                <span className="text-sm font-normal text-text-tertiary">({proof.length})</span>
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              Tasks, incidents, lessons, milestones, artifacts — incidents and lessons are
              first-class proof here.
            </p>
            <div className="mt-5">
              <ProofFeed entries={proof} />
            </div>
            <div className="mt-5">
              <ProofForm subjectType="agent" subjectSlug={agent.slug} />
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

          {(agent.how_built || agent.oversight) && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">How it&apos;s built</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Operational DNA — architecture and oversight, not files for sale.
              </p>
              <div className="mt-3 space-y-3">
                {agent.how_built && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Architecture
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {agent.how_built}
                    </p>
                  </div>
                )}
                {agent.oversight && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Oversight model
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {agent.oversight}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {capabilities.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">Capabilities</h2>
              <p className="mt-1 text-xs text-text-tertiary">Self-assessed, 0–100.</p>
              <div className="mt-3 space-y-3">
                {capabilities.map((cap) => (
                  <div key={cap.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">{cap.name}</span>
                      <span className="text-text-tertiary">{cap.level}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-elevated">
                      <div
                        className="h-1.5 rounded-full bg-accent/70"
                        style={{ width: `${cap.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Attestations{' '}
              <span className="text-sm font-normal text-text-tertiary">
                ({attestations.length})
              </span>
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              Named third-party statements from people with first-hand experience. Attestations are
              what separates Peer-Attested from Evidence-Linked.
            </p>
            <div className="mt-4">
              <AttestationList attestations={attestations} />
            </div>
            <div className="mt-4">
              <AttestationForm
                subjectType="agent"
                subjectSlug={agent.slug}
                subjectLabel="agent"
                evidenceCount={proof.filter((p) => p.evidence_url !== null).length}
              />
            </div>
          </section>

          {/* Files */}
          {files.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Files{' '}
                <span className="text-sm font-normal text-text-tertiary">({files.length})</span>
              </h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Operational documents — soul files, runbooks, configuration references.
              </p>
              <ul className="mt-4 space-y-1">
                {files.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/agents/${agent.slug}/files/${f.path}`}
                      className="flex items-center justify-between gap-2 rounded px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                      <span className="font-mono truncate">{f.path}</span>
                      {f.visibility === 'private' && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">
                          private
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {isOwner && (
                <div className="mt-3">
                  <Link
                    href={`/agents/${agent.slug}/files/new`}
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    + Upload file
                  </Link>
                </div>
              )}
            </section>
          )}
          {files.length === 0 && isOwner && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">Files</h2>
              <p className="mt-1 text-xs text-text-tertiary">No files yet.</p>
              <div className="mt-3">
                <Link
                  href={`/agents/${agent.slug}/files/new`}
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  + Upload file
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <ContactForm subjectType="agent" subjectSlug={agent.slug} subjectName={agent.name} />

          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Facts
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Owner</dt>
                <dd>
                  <Link href={`/owners/${owner.handle}`} className="text-accent hover:underline">
                    {owner.display_name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Platform</dt>
                <dd className="text-text-secondary">{agent.platform}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Lineage</dt>
                <dd className="text-text-secondary">{agent.lineage_kind}</dd>
              </div>
              {agent.operational_since && (
                <div className="flex justify-between gap-2">
                  <dt className="text-text-tertiary">Operating since</dt>
                  <dd className="text-text-secondary">{formatDate(agent.operational_since)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Status</dt>
                <dd className="text-text-secondary">{agent.status}</dd>
              </div>
            </dl>
            {agent.lineage_note && (
              <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-tertiary">
                {agent.lineage_note}
              </p>
            )}
          </div>

          {teams.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Member of teams
              </h3>
              <ul className="mt-3 space-y-2">
                {teams.map((team) => (
                  <li key={team.slug}>
                    <Link
                      href={`/teams/${team.slug}`}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span className="text-lg">{team.avatar}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text-primary">
                          {team.name}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {team.role} · {team.kind}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lineageChildren.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Deployments & forks
              </h3>
              <ul className="mt-3 space-y-1">
                {lineageChildren.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/agents/${child.slug}`}
                      className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-surface-hover"
                    >
                      <span className="text-text-primary">{child.name}</span>
                      <span className="text-xs text-text-tertiary">{child.lineage_kind}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
