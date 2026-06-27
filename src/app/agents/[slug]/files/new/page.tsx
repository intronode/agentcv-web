import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { getAgentProfile } from '@/lib/db/queries';
import { getDb } from '@/lib/db';
import { FileUploadForm } from '@/components/FileUploadForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Upload file — ${slug} — AgentCV` };
}

export default async function AgentFileNewPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/agents/${slug}/files/new`);
  }
  const userId = Number(session.user.id);

  const profile = await getAgentProfile(slug);
  if (!profile) notFound();

  const { agent, owner } = profile;

  // Only owner can upload
  const db = getDb();
  const ownerRow = (await db.prepare('SELECT user_id FROM owners WHERE id=?').get(owner.id)) as
    | { user_id: number | null }
    | undefined;
  if (!ownerRow || ownerRow.user_id !== userId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <a
          href={`/agents/${slug}`}
          className="text-xs text-text-tertiary hover:text-text-secondary"
        >
          &larr; {agent.name}
        </a>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Upload file</h1>
      <FileUploadForm subjectType="agent" subjectSlug={slug} returnUrl={`/agents/${slug}`} />
    </div>
  );
}
