import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { getAgentProfile, getFilesForSubject, getFileByPath } from '@/lib/db/queries';
import { getDb } from '@/lib/db';
import { FileViewer } from '@/components/FileViewer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; path: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, path } = await params;
  const filePath = path.join('/');
  return { title: `${filePath} — ${slug} — AgentCV` };
}

export default async function AgentFilePage({ params }: PageProps) {
  const { slug, path } = await params;
  const filePath = path.join('/');

  const profile = getAgentProfile(slug);
  if (!profile) notFound();

  const { agent, owner } = profile;

  // Auth + ownership check
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const db = getDb();
  const ownerRow = db.prepare('SELECT user_id FROM owners WHERE id=?').get(owner.id) as
    | { user_id: number | null }
    | undefined;
  const isOwner = userId !== null && ownerRow?.user_id === userId;

  // Get file
  const file = getFileByPath('agent', agent.id, filePath);
  if (!file) notFound();

  // Private file: only owner can view
  if (file.visibility === 'private' && !isOwner) {
    notFound();
  }

  // Content to render: public files use content_public, owner sees content_private
  const content =
    file.visibility === 'public' && file.content_public !== null
      ? file.content_public
      : isOwner
        ? file.content_private
        : '';

  // File list for sidebar tree
  const files = isOwner
    ? getFilesForSubject('agent', agent.id, false)
    : getFilesForSubject('agent', agent.id, true);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 overflow-hidden">
      <div className="mb-6">
        <a
          href={`/agents/${slug}`}
          className="text-xs text-text-tertiary hover:text-text-secondary"
        >
          &larr; {agent.name}
        </a>
      </div>
      <FileViewer
        files={files}
        selectedPath={filePath}
        content={content}
        baseUrl={`/agents/${slug}/files`}
      />
    </div>
  );
}
