'use client';

/**
 * ReviewUI — client component for the sanitization review-and-mask interface.
 * Spec: SANITIZER.md §7
 *
 * Renders finding cards with type badge, severity badge, excerpt, suggested
 * mask, and three actions: Apply mask / Edit mask + Apply / Dismiss with reason.
 * Tracks unresolved count live; Publish button activates when all resolved.
 */

import { useState, useCallback } from 'react';
import type { FileFindingRow, FindingType, FindingSeverity, FindingStatus } from '@/lib/db/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReviewUIProps {
  fileId: number;
  filePath: string;
  backUrl: string; // e.g. /teams/ari-collective/files/CLAUDE.md
  initialFindings: FileFindingRow[];
  canPublish: boolean; // server pre-check: scan_complete + 0 unresolved
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<FindingType, string> = {
  secret: 'bg-red-900/60 text-red-300 border-red-800',
  pii: 'bg-orange-900/60 text-orange-300 border-orange-800',
  confidential: 'bg-yellow-900/60 text-yellow-300 border-yellow-800',
};
const TYPE_LABEL: Record<FindingType, string> = {
  secret: 'SECRET',
  pii: 'PII',
  confidential: 'CONFIDENTIAL',
};
const SEV_BADGE: Record<FindingSeverity, string> = {
  critical: 'bg-red-800/80 text-red-200 border-red-700',
  blocking: 'bg-orange-800/80 text-orange-200 border-orange-700',
  advisory: 'bg-zinc-700/80 text-zinc-300 border-zinc-600',
};

// ─── Local state per finding ───────────────────────────────────────────────────

type FindingUIState =
  | { mode: 'idle' }
  | { mode: 'editing-mask'; maskToken: string }
  | { mode: 'dismissing'; reason: string }
  | { mode: 'busy' }
  | { mode: 'resolved'; status: FindingStatus; resolvedMask?: string };

// ─── Main component ────────────────────────────────────────────────────────────

export function ReviewUI({
  fileId,
  filePath,
  backUrl,
  initialFindings,
  canPublish,
}: ReviewUIProps) {
  // Per-finding UI state
  const [findingStates, setFindingStates] = useState<Record<number, FindingUIState>>(() => {
    const s: Record<number, FindingUIState> = {};
    for (const f of initialFindings) {
      s[f.id] =
        f.status === 'unresolved'
          ? { mode: 'idle' }
          : { mode: 'resolved', status: f.status, resolvedMask: f.resolved_mask ?? undefined };
    }
    return s;
  });

  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [rescanBusy, setRescanBusy] = useState(false);

  // Derived: count unresolved
  const unresolvedCount = initialFindings.filter((f) => {
    const s = findingStates[f.id];
    return (
      !s ||
      s.mode === 'idle' ||
      s.mode === 'editing-mask' ||
      s.mode === 'dismissing' ||
      s.mode === 'busy'
    );
  }).length;

  const allResolved = unresolvedCount === 0;
  const canPublishNow = canPublish && allResolved;

  // ── State updater helpers ──────────────────────────────────────────────────

  const setFindingState = useCallback((id: number, state: FindingUIState) => {
    setFindingStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  // ── API calls ──────────────────────────────────────────────────────────────

  async function applyMask(finding: FileFindingRow, resolvedMask: string) {
    setFindingState(finding.id, { mode: 'busy' });
    try {
      const res = await fetch(`/api/files/${fileId}/findings/${finding.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mask', resolved_mask: resolvedMask }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setFindingState(finding.id, { mode: 'resolved', status: 'masked', resolvedMask });
    } catch (err) {
      setFindingState(finding.id, { mode: 'idle' });
      setGlobalError(err instanceof Error ? err.message : 'Unexpected error masking finding');
    }
  }

  async function dismiss(finding: FileFindingRow, reason: string) {
    setFindingState(finding.id, { mode: 'busy' });
    try {
      const res = await fetch(`/api/files/${fileId}/findings/${finding.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', dismiss_reason: reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setFindingState(finding.id, { mode: 'resolved', status: 'dismissed' });
    } catch (err) {
      setFindingState(finding.id, { mode: 'dismissing', reason });
      setGlobalError(err instanceof Error ? err.message : 'Unexpected error dismissing finding');
    }
  }

  async function handlePublish() {
    setPublishBusy(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/files/${fileId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'public' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setPublished(true);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleRescan() {
    setRescanBusy(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/files/${fileId}/rescan`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      // Reload the page to pick up new findings
      window.location.reload();
    } catch (err) {
      setRescanBusy(false);
      setGlobalError(err instanceof Error ? err.message : 'Rescan failed');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (published) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-green-400 text-4xl mb-4">&#10003;</div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">File published</h2>
        <p className="text-zinc-400 text-sm mb-6">
          The file is now publicly visible with all masks applied.
        </p>
        <a
          href={backUrl}
          className="inline-block text-sm px-4 py-2 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          &larr; View file
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <a href={backUrl} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            &larr; {filePath}
          </a>
          <h1 className="mt-1 text-xl font-semibold text-zinc-100">Sanitization Review</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRescan}
            disabled={rescanBusy}
            className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            {rescanBusy ? 'Rescanning…' : 'Re-scan'}
          </button>
          <button
            onClick={handlePublish}
            disabled={!canPublishNow || publishBusy}
            className={[
              'text-sm px-4 py-1.5 rounded font-medium transition-colors',
              canPublishNow && !publishBusy
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed',
            ].join(' ')}
            title={
              !allResolved
                ? `Resolve all ${unresolvedCount} finding${unresolvedCount !== 1 ? 's' : ''} before publishing`
                : !canPublish
                  ? 'File must be fully scanned before publishing'
                  : undefined
            }
          >
            {publishBusy ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-6 flex items-center gap-4 text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-4 py-3">
        <span>
          <span
            className={
              unresolvedCount > 0 ? 'text-amber-400 font-semibold' : 'text-green-400 font-semibold'
            }
          >
            {unresolvedCount}
          </span>{' '}
          unresolved finding{unresolvedCount !== 1 ? 's' : ''}
        </span>
        <span className="text-zinc-700">|</span>
        <span>
          <span className="text-zinc-200 font-semibold">{initialFindings.length}</span> total
        </span>
        {!canPublish && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-amber-500 text-xs">Scan required before publish</span>
          </>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded text-red-300 text-sm">
          {globalError}
          <button
            onClick={() => setGlobalError(null)}
            className="ml-3 text-red-400 hover:text-red-200 text-xs"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Publish error */}
      {publishError && (
        <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-800 rounded text-red-300 text-sm">
          {publishError}
        </div>
      )}

      {/* Finding list */}
      {initialFindings.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg mb-2">No findings</p>
          <p className="text-sm">The scan found no secrets, PII, or confidential references.</p>
          {canPublishNow && (
            <button
              onClick={handlePublish}
              className="mt-6 text-sm px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-medium transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {initialFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              uiState={findingStates[finding.id] ?? { mode: 'idle' }}
              onApplyMask={(mask) => applyMask(finding, mask)}
              onStartEdit={() =>
                setFindingState(finding.id, {
                  mode: 'editing-mask',
                  maskToken: finding.suggested_mask,
                })
              }
              onEditMaskChange={(token) =>
                setFindingState(finding.id, { mode: 'editing-mask', maskToken: token })
              }
              onCancelEdit={() => setFindingState(finding.id, { mode: 'idle' })}
              onStartDismiss={() => setFindingState(finding.id, { mode: 'dismissing', reason: '' })}
              onDismissReasonChange={(reason) =>
                setFindingState(finding.id, { mode: 'dismissing', reason })
              }
              onConfirmDismiss={(reason) => dismiss(finding, reason)}
              onCancelDismiss={() => setFindingState(finding.id, { mode: 'idle' })}
            />
          ))}
        </div>
      )}

      {/* Disclosure copy — SANITIZER.md §9.2 (verbatim) */}
      <div className="mt-10 px-4 py-3 border border-zinc-800 rounded text-xs text-zinc-500 leading-relaxed">
        This file was scanned for secrets, personal information, and confidential business
        references before publication. Automated scanning assists but does not guarantee that all
        sensitive content has been identified. Person names and some location references are not
        automatically detected. You are responsible for reviewing this file before making it public.
      </div>
    </div>
  );
}

// ─── FindingCard ───────────────────────────────────────────────────────────────

interface FindingCardProps {
  finding: FileFindingRow;
  uiState: FindingUIState;
  onApplyMask: (mask: string) => void;
  onStartEdit: () => void;
  onEditMaskChange: (token: string) => void;
  onCancelEdit: () => void;
  onStartDismiss: () => void;
  onDismissReasonChange: (reason: string) => void;
  onConfirmDismiss: (reason: string) => void;
  onCancelDismiss: () => void;
}

const MASK_TOKEN_PATTERN = /^\[[a-z][a-z0-9\-]*\]$/;

function FindingCard({
  finding,
  uiState,
  onApplyMask,
  onStartEdit,
  onEditMaskChange,
  onCancelEdit,
  onStartDismiss,
  onDismissReasonChange,
  onConfirmDismiss,
  onCancelDismiss,
}: FindingCardProps) {
  const isSecret = finding.finding_type === 'secret';

  // Resolved state: compact read-only card
  if (uiState.mode === 'resolved') {
    return (
      <div className="border border-zinc-800 rounded p-4 opacity-60">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={finding.finding_type} />
          <SevBadge severity={finding.severity} />
          <span className="text-xs text-zinc-500 font-mono">{finding.detector_id}</span>
          <span className="ml-auto text-xs font-medium text-green-400 uppercase tracking-wide">
            {uiState.status === 'masked'
              ? `Masked as ${uiState.resolvedMask ?? finding.suggested_mask}`
              : 'Dismissed'}
          </span>
        </div>
        <Excerpt text={finding.excerpt} />
      </div>
    );
  }

  if (uiState.mode === 'busy') {
    return (
      <div className="border border-zinc-800 rounded p-4 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-48 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-full" />
      </div>
    );
  }

  const editMaskValid =
    uiState.mode === 'editing-mask' ? MASK_TOKEN_PATTERN.test(uiState.maskToken) : true;
  const dismissMinLen = isSecret ? 20 : 1;
  const dismissReady =
    uiState.mode === 'dismissing' ? uiState.reason.trim().length >= dismissMinLen : false;

  return (
    <div className="border border-zinc-800 rounded p-4">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <TypeBadge type={finding.finding_type} />
        <SevBadge severity={finding.severity} />
        <span className="text-xs text-zinc-500 font-mono">{finding.detector_id}</span>
        <span className="ml-auto text-xs text-zinc-600 font-mono">#{finding.id}</span>
      </div>

      {/* Excerpt */}
      <Excerpt text={finding.excerpt} />

      {/* Suggested mask */}
      <div className="mt-2 text-xs text-zinc-500">
        Suggested mask:{' '}
        <code className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded font-mono">
          {finding.suggested_mask}
        </code>
      </div>

      {/* Actions */}
      <div className="mt-4">
        {uiState.mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            {/* Apply suggested mask */}
            <button
              onClick={() => onApplyMask(finding.suggested_mask)}
              className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors font-medium"
            >
              Apply mask
            </button>
            {/* Edit mask (not for secrets — they get the suggested token only) */}
            {!isSecret && (
              <button
                onClick={onStartEdit}
                className="text-xs px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Edit mask
              </button>
            )}
            {/* Dismiss */}
            <button
              onClick={onStartDismiss}
              className="text-xs px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {uiState.mode === 'editing-mask' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={uiState.maskToken}
                onChange={(e) => onEditMaskChange(e.target.value)}
                placeholder="[your-label]"
                className={[
                  'flex-1 bg-zinc-900 border rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none',
                  editMaskValid
                    ? 'border-zinc-700 focus:border-zinc-500'
                    : 'border-red-700 focus:border-red-600',
                ].join(' ')}
              />
              <button
                onClick={() => onApplyMask(uiState.maskToken)}
                disabled={!editMaskValid}
                className="text-xs px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
            {!editMaskValid && uiState.maskToken.length > 0 && (
              <p className="text-xs text-red-400">
                Token must match <code>[a-z][a-z0-9-]*</code> wrapped in square brackets, e.g.{' '}
                <code>[deal-name]</code>
              </p>
            )}
          </div>
        )}

        {uiState.mode === 'dismissing' && (
          <div className="space-y-2">
            {isSecret && (
              <div className="text-xs text-amber-400 bg-amber-900/30 border border-amber-800 rounded px-3 py-2">
                This finding may be a real credential. Dismissing it will publish this content
                unmasked. Provide a justification of at least 20 characters.
              </div>
            )}
            <textarea
              value={uiState.reason}
              onChange={(e) => onDismissReasonChange(e.target.value)}
              placeholder={
                isSecret
                  ? 'Justification (≥20 chars required for secrets)…'
                  : 'Reason for dismissal…'
              }
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => onConfirmDismiss(uiState.reason)}
                disabled={!dismissReady}
                className="text-xs px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800/60 border border-red-800 text-red-300 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm dismiss
              </button>
              <button
                onClick={onCancelDismiss}
                className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              {isSecret && (
                <span className="text-xs text-zinc-600 ml-1">
                  {uiState.reason.trim().length}/{dismissMinLen} chars
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small UI primitives ───────────────────────────────────────────────────────

function TypeBadge({ type }: { type: FindingType }) {
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${TYPE_BADGE[type]}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function SevBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${SEV_BADGE[severity]}`}
    >
      {severity}
    </span>
  );
}

function Excerpt({ text }: { text: string }) {
  return (
    <pre className="mt-2 text-xs font-mono bg-zinc-900 border border-zinc-800 rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-words text-zinc-300">
      {text}
    </pre>
  );
}
