import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import {
  getAgentProfile,
  getFilesForSubject,
  getFileByPath,
  getFileFindings,
  getFileScanLog,
} from '@/lib/db/queries';
import { getDb } from '@/lib/db';
import { FileViewer } from '@/components/FileViewer';
import { ReviewUI } from '@/components/ReviewUI';
import { ScanLogPanel } from '@/components/ScanLogPanel';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; path: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, path } = await params;
  const isReview = path[path.length - 1] === 'review';
  const filePath = isReview ? path.slice(0, -1).join('/') : path.join('/');
  const suffix = isReview ? ' — Review' : '';
  return { title: `${filePath}${suffix} — ${slug} — AgentCV` };
}

export default async function AgentFilePage({ params }: PageProps) {
  const { slug, path } = await params;

  // Detect review mode: last segment === 'review'
  const isReview = path[path.length - 1] === 'review';
  const filePath = isReview ? path.slice(0, -1).join('/') : path.join('/');

  const profile = await getAgentProfile(slug);
  if (!profile) notFound();

  const { agent, owner } = profile;

  // Auth + ownership check
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const db = getDb();
  const ownerRow = (await db.prepare('SELECT user_id FROM owners WHERE id=?').get(owner.id)) as
    | { user_id: number | null }
    | undefined;
  const isOwner = userId !== null && ownerRow?.user_id === userId;

  // Get file
  const file = await getFileByPath('agent', agent.id, filePath);
  if (!file) notFound();

  // Private file: only owner can view
  if (file.visibility === 'private' && !isOwner) {
    notFound();
  }

  // Review page: owner-only
  if (isReview) {
    if (!isOwner) notFound();

    const findings = await getFileFindings(file.id);
    // canPublish = "scan completed successfully" — the client handles allResolved tracking.
    // The API route (/api/files/[id]/visibility) has its own canMakeFilePublic() gate
    // that enforces no-unresolved-findings at publish time (server-side security).
    // Passing canMakeFilePublic() here would permanently disable Publish in the client
    // because the prop is set at page-load time (before the user resolves findings).
    const publishable = file.sanitization_state === 'scan_complete';

    return (
      <ReviewUI
        fileId={file.id}
        filePath={filePath}
        backUrl={`/agents/${slug}/files/${filePath}`}
        initialFindings={findings}
        canPublish={publishable}
      />
    );
  }

  // Normal file viewer
  const content =
    file.visibility === 'public' && file.content_public !== null
      ? file.content_public
      : isOwner
        ? file.content_private
        : '';

  const files = isOwner
    ? await getFilesForSubject('agent', agent.id, false)
    : await getFilesForSubject('agent', agent.id, true);

  const scanLog = isOwner ? await getFileScanLog(file.id, 5) : [];

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
        fileId={file.id}
        sanitizationState={file.sanitization_state}
        visibility={file.visibility}
        isOwner={isOwner}
        reviewUrl={isOwner ? `/agents/${slug}/files/${filePath}/review` : undefined}
        publicDisclosure={file.visibility === 'public'}
      />
      {isOwner && scanLog.length > 0 && <ScanLogPanel entries={scanLog} />}
    </div>
  );
}
