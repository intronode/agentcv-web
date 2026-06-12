'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FileUploadFormProps {
  subjectType: 'agent' | 'team';
  subjectSlug: string;
  returnUrl: string;
}

export function FileUploadForm({ subjectType, subjectSlug, returnUrl }: FileUploadFormProps) {
  const router = useRouter();
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_type: subjectType,
          subject_slug: subjectSlug,
          path: path.trim(),
          content,
        }),
      });
      const data = (await res.json()) as { id?: number; path?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      router.push(returnUrl);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="path">
          File path
        </label>
        <input
          id="path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="LESSONS.md"
          required
          className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Relative path, .md or .markdown only, max 2 segments (e.g. <code>docs/RUNBOOK.md</code>)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5" htmlFor="content">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          required
          className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-y"
          placeholder="# Title&#10;&#10;Content here..."
        />
        <p className="mt-1 text-xs text-text-tertiary">
          Max 64 KB. Files start private — publishing requires sanitization review.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload file'}
        </button>
        <a href={returnUrl} className="text-sm text-text-tertiary hover:text-text-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
