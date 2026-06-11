import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOwnerProfile } from '@/lib/db/queries';
import AgentCard from '@/components/AgentCard';
import ConfigurationCard from '@/components/ConfigurationCard';
import ContactForm from '@/components/ContactForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const profile = getOwnerProfile(handle);
  return { title: profile ? `${profile.owner.display_name} — AgentCV` : 'Owner — AgentCV' };
}

export default async function OwnerProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const profile = getOwnerProfile(handle);
  if (!profile) notFound();
  const { owner, agents, configurations } = profile;

  const totalProof =
    agents.reduce((s, a) => s + a.proofCount, 0) +
    configurations.reduce((s, c) => s + c.proofCount, 0);

  // Detect curated-owner disclosure embedded by seed.ts
  const isCurated =
    !!owner.bio &&
    (owner.bio.includes('curated from public sources') ||
      owner.bio.includes('not claimed by the organization'));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
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
          {owner.website_url && (
            <a
              href={owner.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              {owner.website_url}
            </a>
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

      {/* Compact summary strip — gives above-the-fold density */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm">
        <span className="font-semibold text-text-primary">
          {configurations.length}{' '}
          <span className="font-normal text-text-tertiary">
            configuration{configurations.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="text-border">·</span>
        <span className="font-semibold text-text-primary">
          {agents.length}{' '}
          <span className="font-normal text-text-tertiary">
            agent component{agents.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="text-border">·</span>
        <span className="font-semibold text-text-primary">
          {totalProof}{' '}
          <span className="font-normal text-text-tertiary">
            proof entr{totalProof === 1 ? 'y' : 'ies'}
          </span>
        </span>
      </div>

      {isCurated && (
        <p className="mt-4 rounded-lg border border-blue-400/30 bg-blue-500/5 px-4 py-3 text-xs leading-relaxed text-blue-200">
          This owner profile was curated from cited public sources and has not been claimed by the
          organization. Data reflects what is publicly documented.
        </p>
      )}

      {configurations.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            Configurations{' '}
            <span className="text-sm font-normal text-text-tertiary">
              ({configurations.length})
            </span>
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Agent harnesses published by this owner — topology, roster, and evidence.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {configurations.map((config) => (
              <ConfigurationCard key={config.slug} config={config} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Agent components{' '}
          <span className="text-sm font-normal text-text-tertiary">({agents.length})</span>
        </h2>
        {agents.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
            No agent components on record.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.slug} agent={agent} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
