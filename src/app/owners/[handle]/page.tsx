import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  getOwnerProfile,
  getOwnersStrip,
  getCounts,
  getConfidentialTermCount,
  getRawConfidentialTerms,
} from '@/lib/db/queries';
import AgentCard from '@/components/AgentCard';
import TeamCard from '@/components/TeamCard';
import ContactForm from '@/components/ContactForm';
import ClaimOwnerButton from '@/components/ClaimOwnerButton';
import ConfidentialTermsManager from '@/components/ConfidentialTermsManager';
import { formatDate, formatMetricValue } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getOwnerProfile(handle);
  return { title: profile ? `${profile.owner.display_name} — AgentCV` : 'Owner — AgentCV' };
}

// Proof type labels
const PROOF_TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  incident: 'Incident',
  lesson: 'Lesson',
  milestone: 'Milestone',
  artifact: 'Artifact',
};

export default async function OwnerProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const profile = await getOwnerProfile(handle);
  if (!profile) notFound();
  const { owner, agents, teams, proofFeed } = profile;

  // Session for claim UI
  const session = await auth();
  const sessionUserId = session?.user?.id ? Number(session.user.id) : null;
  const isClaimed = owner.user_id !== null;
  const isOwnedByMe = isClaimed && sessionUserId !== null && owner.user_id === sessionUserId;
  // Unclaimed + signed-in + not already owned by this user → show claim button
  const canClaim = !isClaimed && sessionUserId !== null;

  // Confidential terms — only loaded for the owner themselves
  // getConfidentialTermCount / getRawConfidentialTerms require the DB owner.id
  const confidentialTermCount = isOwnedByMe ? await getConfidentialTermCount(owner.id) : 0;
  const confidentialTerms = isOwnedByMe
    ? (await getRawConfidentialTerms(owner.id)).map(({ id, created_at }) => ({ id, created_at }))
    : [];

  // Owners strip — all owners with teams, for cross-owner discoverability
  const ownersStrip = await getOwnersStrip();
  const totalTeams = (await getCounts()).teams;

  const totalProof =
    agents.reduce((s, a) => s + a.proofCount, 0) + teams.reduce((s, t) => s + t.proofCount, 0);

  // Compute evidence-linked count accurately:
  // - agents: use evidenceCount from card data (covers all agent proof entries)
  // - teams: use proofFeed (capped at 20 across subjects, may undercount for prolific owners)
  const agentEvidenceLinked = agents.reduce((s, a) => s + a.evidenceCount, 0);
  const teamEvidenceLinkedFromFeed = proofFeed.filter(
    (p) => p.subjectKind === 'team' && p.evidence_url !== null
  ).length;
  const totalEvidenceLinked = agentEvidenceLinked + teamEvidenceLinkedFromFeed;

  // Detect curated-owner disclosure embedded by seed.ts
  const isCurated =
    !!owner.bio &&
    (owner.bio.includes('curated from public sources') ||
      owner.bio.includes('not claimed by the organization'));

  // Detect shared team metric: when multiple agents all point to the same
  // viaConfigMetric key+value, surface it once as a team block and suppress
  // per-card repetition.
  const agentsWithViaMetric = agents.filter(
    (a) => (a.metrics ?? []).length === 0 && a.viaConfigMetric
  );
  const firstVia = agentsWithViaMetric[0]?.viaConfigMetric ?? null;
  const sharedTeamMetric =
    agentsWithViaMetric.length >= 2 &&
    firstVia !== null &&
    agentsWithViaMetric.every(
      (a) => a.viaConfigMetric!.key === firstVia.key && a.viaConfigMetric!.value === firstVia.value
    )
      ? firstVia
      : null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{owner.display_name}</h1>
            <span className="rounded border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {owner.kind}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-tertiary">@{owner.handle}</p>
          {owner.bio && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
              {owner.bio}
            </p>
          )}
        </div>
        <div className="w-full max-w-xs">
          <ContactForm
            subjectType="owner"
            subjectSlug={owner.handle}
            subjectName={owner.display_name}
          />
        </div>
      </header>

      {/* ── Website link row (dedicated, visible) ──────────────────────────── */}
      {owner.website_url && (
        <div className="mt-4 flex items-center gap-2">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-text-tertiary"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <a
            href={owner.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline"
          >
            {owner.website_url.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      {/* ── Compact summary strip ──────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm">
        <span className="font-semibold text-text-primary">
          {agents.length}{' '}
          <span className="font-normal text-text-tertiary">
            agent component{agents.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="text-text-tertiary">·</span>
        <span className="font-semibold text-text-primary">
          {totalProof}{' '}
          <span className="font-normal text-text-tertiary">
            proof entr{totalProof === 1 ? 'y' : 'ies'}
          </span>
        </span>
        {totalEvidenceLinked > 0 && (
          <>
            <span className="text-text-tertiary">·</span>
            <span className="font-semibold text-blue-300">
              {totalEvidenceLinked}{' '}
              <span className="font-normal text-text-tertiary">evidence-linked</span>
            </span>
          </>
        )}
        <span className="text-text-tertiary">·</span>
        <span className="font-semibold text-text-primary">
          {teams.length}{' '}
          <span className="font-normal text-text-tertiary">
            team{teams.length === 1 ? '' : 's'}
            {totalTeams > 0 && <> (of {totalTeams} on the registry)</>}
          </span>
        </span>
      </div>

      {isCurated && (
        <p className="mt-4 rounded-lg border border-blue-400/30 bg-blue-500/5 px-4 py-3 text-xs leading-relaxed text-blue-200">
          This owner profile was curated from cited public sources and has not been claimed by the
          organization. Data reflects what is publicly documented.
        </p>
      )}

      {/* ── Claim / claimed status ─────────────────────────────────────────── */}
      {isOwnedByMe ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 text-xs text-accent">
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
            <polyline points="20 6 9 17 4 12" />
          </svg>
          You own this profile
        </div>
      ) : isClaimed ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs text-text-tertiary">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Claimed
        </div>
      ) : canClaim ? (
        <div className="mt-4">
          <ClaimOwnerButton ownerHandle={owner.handle} ownerName={owner.display_name} />
        </div>
      ) : !isClaimed && !sessionUserId ? (
        <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-2.5 text-xs text-text-tertiary">
          <Link href="/signin" className="text-accent hover:underline">
            Sign in
          </Link>{' '}
          to claim this profile if it belongs to you.
        </div>
      ) : null}

      {/* ── Confidential terms deny-list (owner only) ─────────────────────── */}
      {isOwnedByMe && (
        <ConfidentialTermsManager
          ownerHandle={owner.handle}
          initialCount={confidentialTermCount}
          initialTerms={confidentialTerms}
        />
      )}

      {/* ── Agent components (prominent section) ──────────────────────────── */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Agent components{' '}
              <span className="text-sm font-normal text-text-tertiary">({agents.length})</span>
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Individual agents that make up this owner&apos;s teams. Each card shows model,
              platform, metrics, and proof count.
            </p>
          </div>
          {agents.length > 0 && (
            <Link
              href={`/agents?owner=${owner.handle}`}
              className="shrink-0 text-sm text-accent hover:underline"
            >
              View all agents →
            </Link>
          )}
        </div>

        {/* Shared team metric block — rendered once instead of repeating on every card */}
        {sharedTeamMetric && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm">
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
              Team metric
            </span>
            <span className="text-text-tertiary">—</span>
            <span className="text-xs text-text-secondary">
              shared by all {agentsWithViaMetric.length} members via{' '}
              <span className="font-medium text-text-primary">{sharedTeamMetric.configName}</span>
            </span>
            <span className="text-text-tertiary">·</span>
            <span className="text-xs text-text-secondary">{sharedTeamMetric.label}</span>
            <span className="font-semibold text-text-primary">
              {formatMetricValue(sharedTeamMetric.value, sharedTeamMetric.unit)}
            </span>
          </div>
        )}

        {agents.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
            No agent components on record.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.slug} className="min-w-0">
                <AgentCard agent={agent} hideViaConfigMetric={sharedTeamMetric !== null} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Teams ──────────────────────────────────────────────────────────── */}
      {teams.length > 0 && (
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Teams <span className="text-sm font-normal text-text-tertiary">({teams.length})</span>
            </h2>
            {teams.length < totalTeams && (
              <span className="text-xs text-text-tertiary">
                {teams.length === 1
                  ? `1 team · one of ${totalTeams} on the registry —`
                  : `${teams.length} teams · out of ${totalTeams} on the registry —`}{' '}
                <Link href="/teams" className="text-accent hover:underline">
                  browse all
                </Link>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Agent harnesses published by this owner — topology, roster, and evidence.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div key={team.slug} className="min-w-0">
                <TeamCard team={team} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Proof feed (aggregated across all subjects) ───────────────────── */}
      {proofFeed.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight">Proof feed</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Recent proof entries across all agents and teams.{' '}
              <span className="text-text-tertiary">{totalProof} total.</span>
            </p>
          </div>
          <div className="space-y-2">
            {proofFeed.map((entry) => {
              const isOneLiner = !entry.body || entry.body.trim().length === 0;
              return isOneLiner ? (
                /* ── Compact row for title-only entries ── */
                <div
                  key={`${entry.subject_type}-${entry.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5"
                >
                  <Link
                    href={`/${entry.subjectKind === 'agent' ? 'agents' : 'teams'}/${entry.subjectSlug}`}
                    className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:text-accent"
                  >
                    {entry.subjectKind === 'team' ? '⚙' : '🤖'} {entry.subjectName}
                  </Link>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-tertiary">
                    {PROOF_TYPE_LABELS[entry.type] ?? entry.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {entry.title}
                  </span>
                  {entry.evidence_url && (
                    <a
                      href={entry.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] text-blue-300 hover:underline"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2 2h3" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      evidence
                    </a>
                  )}
                  <span className="shrink-0 text-[10px] text-text-tertiary">
                    {formatDate(entry.entry_date)}
                  </span>
                </div>
              ) : (
                /* ── Full card for entries with body text ── */
                <div
                  key={`${entry.subject_type}-${entry.id}`}
                  className="rounded-xl border border-border bg-surface-elevated px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${entry.subjectKind === 'agent' ? 'agents' : 'teams'}/${entry.subjectSlug}`}
                      className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:text-accent"
                    >
                      {entry.subjectKind === 'team' ? '⚙' : '🤖'} {entry.subjectName}
                    </Link>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-tertiary">
                      {PROOF_TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                    {entry.evidence_url && (
                      <a
                        href={entry.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2 2h3" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        evidence
                      </a>
                    )}
                    <span className="ml-auto text-[10px] text-text-tertiary">
                      {formatDate(entry.entry_date)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-secondary">
                    {entry.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Owners on the registry strip ───────────────────────────────────── */}
      {ownersStrip.length > 1 && (
        <section className="mt-16 border-t border-border pt-8">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Owners on the registry
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {ownersStrip.length} registered operators — click to view their profiles
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ownersStrip.map((entry) => (
              <Link
                key={entry.handle}
                href={`/owners/${entry.handle}`}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-surface-hover ${
                  entry.handle === owner.handle
                    ? 'border-accent/40 bg-accent/5 text-accent'
                    : 'border-border bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="font-medium">{entry.displayName}</span>
                <span className="text-text-tertiary">
                  {entry.configCount} team{entry.configCount !== 1 ? 's' : ''}
                </span>
                {entry.layerMix && (
                  <span className="hidden text-text-tertiary sm:inline">
                    ·{' '}
                    {entry.layerMix
                      .split(',')
                      .map((l: string) => l.trim())
                      .join(' / ')}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
