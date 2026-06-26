'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { FileListItem, SanitizationState, FileVisibility } from '@/lib/db/types';

interface FileViewerProps {
  /** Flat list of all accessible files for this subject */
  files: FileListItem[];
  /** The currently selected file path (from URL) */
  selectedPath: string;
  /** The markdown content to render (already resolved server-side) */
  content: string;
  /** Base URL for file links within this subject, e.g. /teams/ari-collective/files */
  baseUrl: string;
  /** File ID — required for sanitizer-aware toolbar */
  fileId?: number;
  /** Current sanitization state */
  sanitizationState?: SanitizationState;
  /** Current visibility */
  visibility?: FileVisibility;
  /** True when the viewing user is the owner */
  isOwner?: boolean;
  /** URL of the review page for this file (owner-only) */
  reviewUrl?: string;
  /** Show public-file disclosure copy */
  publicDisclosure?: boolean;
}

/**
 * ReactMarkdown component overrides that fix mobile overflow:
 * - table: wrapped in overflow-x-auto so GFM tables scroll horizontally
 *   within their own contained region instead of widening the document.
 * - pre/code: max-w-full + overflow-x-auto so code blocks are contained.
 */
const markdownComponents: Components = {
  // Wrap every GFM table in a contained horizontal-scroll region.
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto w-full">
      <table {...props}>{children}</table>
    </div>
  ),
  // Code blocks: contained scroll, no document-widening.
  pre: ({ children, ...props }) => (
    <pre {...props} className="overflow-x-auto max-w-full">
      {children}
    </pre>
  ),
};

const SCAN_STATE_LABEL: Record<SanitizationState, string> = {
  needs_scan: 'Needs scan',
  scan_complete: 'Scanned',
  scan_error: 'Scan error',
};
const SCAN_STATE_CLASS: Record<SanitizationState, string> = {
  needs_scan: 'text-amber-500',
  scan_complete: 'text-green-500',
  scan_error: 'text-red-400',
};

export function FileViewer({
  files,
  selectedPath,
  content,
  baseUrl,
  sanitizationState,
  isOwner,
  reviewUrl,
  publicDisclosure,
}: FileViewerProps) {
  const [mode, setMode] = useState<'rendered' | 'raw'>('rendered');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    /* Outer wrapper: overflow-hidden prevents any child from widening the page */
    <div className="w-full overflow-hidden min-h-[400px]">
      {/* Mobile file-tree drawer toggle — only visible below md breakpoint */}
      <div className="md:hidden mb-3">
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border border-zinc-700 rounded px-3 py-1"
          aria-expanded={drawerOpen}
          aria-controls="file-tree-drawer"
        >
          {drawerOpen ? 'Hide files ▲' : 'Files ▼'}
        </button>
        {drawerOpen && (
          <div id="file-tree-drawer" className="mt-2 border border-zinc-800 rounded p-3">
            <ul className="space-y-1">
              {files.map((f) => (
                <li key={f.id}>
                  <a
                    href={`${baseUrl}/${f.path}`}
                    className={[
                      'block text-sm px-2 py-1 rounded truncate transition-colors',
                      f.path === selectedPath
                        ? 'bg-zinc-800 text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                    ].join(' ')}
                    title={f.path}
                  >
                    {f.path}
                  </a>
                  {f.visibility === 'private' && (
                    <span className="ml-2 text-[10px] text-zinc-400 uppercase tracking-wide">
                      private
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Two-pane layout — desktop only (md+); on mobile the sidebar is hidden */}
      <div className="flex gap-6">
        {/* Sidebar tree — hidden on mobile, shown as fixed-width column on md+ */}
        <aside className="hidden md:block w-48 shrink-0">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Files</p>
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.id}>
                <a
                  href={`${baseUrl}/${f.path}`}
                  className={[
                    'block text-sm px-2 py-1 rounded truncate transition-colors',
                    f.path === selectedPath
                      ? 'bg-zinc-800 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                  ].join(' ')}
                  title={f.path}
                >
                  {f.path}
                </a>
                {f.visibility === 'private' && (
                  <span className="ml-2 text-[10px] text-zinc-400 uppercase tracking-wide">
                    private
                  </span>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Content panel: min-w-0 is critical — without it flex children can overflow */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm text-zinc-400 font-mono truncate min-w-0">
                {selectedPath}
              </span>
              {/* Sanitization state badge — owner only */}
              {isOwner && sanitizationState && (
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${SCAN_STATE_CLASS[sanitizationState]}`}
                >
                  {SCAN_STATE_LABEL[sanitizationState]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Review link — owner only, if scan is complete or has findings */}
              {isOwner && reviewUrl && (
                <a
                  href={reviewUrl}
                  className="text-xs px-3 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors font-medium"
                >
                  Review
                </a>
              )}
              {/* Rendered / Raw toggle */}
              <div className="flex items-center gap-1 border border-zinc-700 rounded overflow-hidden">
                <button
                  onClick={() => setMode('rendered')}
                  className={[
                    'px-3 py-1 text-xs font-medium transition-colors',
                    mode === 'rendered'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  Rendered
                </button>
                <button
                  onClick={() => setMode('raw')}
                  className={[
                    'px-3 py-1 text-xs font-medium transition-colors',
                    mode === 'raw'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200',
                  ].join(' ')}
                >
                  Raw
                </button>
              </div>
            </div>
          </div>

          {/* Disclosure copy — public files only (§9.2 verbatim) */}
          {publicDisclosure && (
            <div className="mb-4 px-3 py-2 border border-zinc-800 rounded text-[11px] text-zinc-400 leading-relaxed">
              This file was scanned for secrets, personal information, and confidential business
              references before publication. Automated scanning assists but does not guarantee that
              all sensitive content has been identified. Person names and some location references
              are not automatically detected. You are responsible for reviewing this file before
              making it public.
            </div>
          )}

          {/* Content */}
          {mode === 'rendered' ? (
            /*
             * Prose container:
             * - [overflow-wrap:break-word] breaks long unbroken strings/URLs
             * - [word-break:break-word] legacy fallback for older engines
             * - overflow-hidden prevents the prose region itself from widening page
             * - prose-pre:overflow-x-auto + prose-pre:max-w-full: Tailwind typography
             *   plugin overrides for code blocks (belt-and-suspenders with the
             *   markdownComponents.pre override above)
             */
            <div
              className="
                prose prose-invert prose-sm max-w-none
                prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700
                prose-pre:overflow-x-auto prose-pre:max-w-full
                overflow-hidden
                [overflow-wrap:break-word] [word-break:break-word]
              "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            /*
             * Raw view: whitespace-pre-wrap + break-words handles long lines.
             * overflow-x-auto on the <pre> gives a contained horizontal scroll
             * if a line is truly unbreakable (e.g. a URL with no spaces).
             */
            <pre className="text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-700 rounded p-4 overflow-x-auto whitespace-pre-wrap break-words max-w-full">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
