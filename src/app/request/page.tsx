import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getConfigurationProfile } from '@/lib/db/queries';
import RequestForm from './RequestForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Request a Setup — AgentCV' };

interface PageProps {
  searchParams: Promise<{ config?: string }>;
}

export default async function RequestPage({ searchParams }: PageProps) {
  const { config: configSlug } = await searchParams;

  // Pre-load the referenced configuration name if slug provided.
  let refConfig: { slug: string; name: string } | null = null;
  if (configSlug) {
    const profile = getConfigurationProfile(configSlug);
    if (profile) {
      refConfig = { slug: configSlug, name: profile.configuration.name };
    }
  }

  const session = await auth();
  const sessionUser = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null }
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
        Request a setup
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Request a team setup</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Found a team that works for your use case? Request a consultation or custom setup. Tell us
        what you need to build or run.
      </p>
      <p className="mt-2 text-xs text-text-tertiary">
        <Link href="/owners/intronode" className="text-accent hover:underline">
          Intronode
        </Link>{' '}
        — the studio operating the Ari Collective — reviews every request.
      </p>

      <RequestForm refConfig={refConfig} sessionUser={sessionUser} />
    </div>
  );
}
