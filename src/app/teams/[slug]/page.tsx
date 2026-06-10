import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTeamProfile } from '@/lib/db/queries';
import TrustBadge from '@/components/TrustBadge';
import MetricGrid from '@/components/MetricGrid';
import ProofFeed from '@/components/ProofFeed';
import ProofForm from '@/components/ProofForm';
import AttestationList from '@/components/AttestationList';
import ContactForm from '@/components/ContactForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getTeamProfile(slug);
  return { title: profile ? `${profile.team.name} — AgentCV` : 'Team — AgentCV' };
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const profile = getTeamProfile(slug);
  if (!profile) notFound();
  const { team, owner, tier, members, metrics, proof, attestations } = profile;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <header className="flex flex-wrap items-start gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-elevated text-4xl">
          {team.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <span className="rounded border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              {team.kind}
            </span>
            <TrustBadge tier={tier} size="md" />
          </div>
          <p className="mt-1.5 max-w-2xl text-text-secondary">{team.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Link href={`/owners/${owner.handle}`} className="text-accent hover:underline">
              {owner.display_name}
            </Link>
            <span className="text-text-tertiary">· {members.length} members</span>
          </div>
        </div>
      </header>

      {team.illustrative === 1 && (
        <p className="mt-6 rounded-lg border border-dashed border-orange-400/40 bg-orange-500/5 px-4 py-3 text-xs leading-relaxed text-orange-200">
          Parts of this profile are illustrative — demo or approximate data, marked entry-by-entry.
          Unmarked entries are real.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          {team.about && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">About</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {team.about}
              </p>
            </section>
          )}

          {/* Composition & topology */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Composition & topology</h2>
            {team.topology && (
              <p className="mt-3 rounded-lg border border-border bg-surface-elevated p-4 text-sm leading-relaxed text-text-secondary">
                {team.topology}
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <Link
                  key={member.slug}
                  href={`/agents/${member.slug}`}
                  className="group rounded-xl border border-border bg-surface-elevated p-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xl">
                      {member.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary transition-colors group-hover:text-accent">
                          {member.name}
                        </span>
                        <span className="rounded bg-accent/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-accent">
                          {member.role}
                        </span>
                      </div>
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

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Metrics</h2>
            <div className="mt-3">
              <MetricGrid metrics={metrics} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight">
              Proof <span className="text-sm font-normal text-text-tertiary">({proof.length})</span>
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              The team&apos;s shared track record — including incidents and lessons.
            </p>
            <div className="mt-5">
              <ProofFeed entries={proof} />
            </div>
            <div className="mt-5">
              <ProofForm subjectType="team" subjectSlug={team.slug} />
            </div>
          </section>

          {(team.how_built || team.oversight) && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">How it&apos;s built</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Operational DNA — architecture and oversight, not files for sale.
              </p>
              <div className="mt-3 space-y-3">
                {team.how_built && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Architecture
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {team.how_built}
                    </p>
                  </div>
                )}
                {team.oversight && (
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      Oversight model
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                      {team.oversight}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Attestations</h2>
            <div className="mt-3">
              <AttestationList attestations={attestations} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <ContactForm subjectType="team" subjectSlug={team.slug} subjectName={team.name} />
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
                <dt className="text-text-tertiary">Kind</dt>
                <dd className="text-text-secondary">{team.kind}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Members</dt>
                <dd className="text-text-secondary">{members.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-text-tertiary">Status</dt>
                <dd className="text-text-secondary">{team.status}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
