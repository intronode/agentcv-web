'use client';

/**
 * CompareTray — floating tray that accumulates selected configuration slugs
 * and fires /compare?ids=... navigation.
 *
 * State: URL-based. Selected slugs live in a URL search param `compare` so
 * the selection survives page navigation and is shareable. This avoids
 * localStorage serialization complexity and SSR/hydration mismatches.
 *
 * Usage:
 *   <CompareTray /> — mounts the floating tray
 *   <CompareToggle slug="foo" name="Bar" /> — toggle button on each card
 *
 * Both components share state via the URL param: a change to `compare` in
 * the URL causes a shallow router.replace, which triggers a re-render in
 * any component that reads useSearchParams().
 */

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback } from 'react';

const PARAM = 'compare';
const MAX = 3;

export function useCompareState() {
  const params = useSearchParams();
  const router = useRouter();

  const selected: string[] = (params.get(PARAM) ?? '').split(',').filter(Boolean);

  const toggle = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(params.toString());
      const current = (next.get(PARAM) ?? '').split(',').filter(Boolean);
      const idx = current.indexOf(slug);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else if (current.length < MAX) {
        current.push(slug);
      }
      if (current.length > 0) {
        next.set(PARAM, current.join(','));
      } else {
        next.delete(PARAM);
      }
      // Shallow replace keeps the user on the same page without a full navigation
      const search = next.toString();
      const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [params, router]
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete(PARAM);
    const search = next.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [params, router]);

  return { selected, toggle, clear };
}

/**
 * Chip representing one selected configuration in the tray.
 * Displays the slug (or name if available) and an × remove button.
 */
function SelectionChip({ slug, onRemove }: { slug: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
      <span className="max-w-[120px] truncate">{slug}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${slug} from comparison`}
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-accent/60 transition-colors hover:text-accent"
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M1 1l6 6M7 1L1 7" />
        </svg>
      </button>
    </span>
  );
}

/** The floating tray that appears when ≥1 configuration is selected */
export function CompareTray() {
  const { selected, toggle, clear } = useCompareState();

  if (selected.length === 0) return null;

  const canCompare = selected.length >= 2;
  const compareUrl = `/compare?ids=${selected.join(',')}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-5 pointer-events-none"
      role="status"
      aria-live="polite"
      style={{ animation: 'slideUpTray 0.2s ease-out both' }}
    >
      <style>{`
        @keyframes slideUpTray {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div
        className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-accent/30 bg-surface shadow-2xl shadow-black/60 backdrop-blur-md"
        style={{ borderTopColor: 'var(--color-accent)', borderTopWidth: '2px' }}
      >
        {/* Top accent stripe is handled via border-top above */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
          {/* Count badge */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {selected.length}
            </span>
            <span className="text-xs font-semibold text-text-primary">
              {selected.length === 1 ? 'team' : 'teams'} selected
            </span>
          </div>

          {/* Chips */}
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {selected.map((slug) => (
              <SelectionChip key={slug} slug={slug} onRemove={() => toggle(slug)} />
            ))}
          </div>

          {/* Actions */}
          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <button
              onClick={clear}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:border-border-subtle hover:text-text-secondary"
              aria-label="Clear all selections"
            >
              Clear all
            </button>

            {canCompare ? (
              <Link
                href={compareUrl}
                className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Compare {selected.length} →
              </Link>
            ) : (
              <div className="flex flex-col items-end">
                <span className="cursor-not-allowed rounded-lg bg-surface-elevated px-4 py-1.5 text-sm font-semibold text-text-tertiary opacity-60 select-none">
                  Compare {selected.length}
                </span>
                <span className="mt-0.5 text-[10px] text-text-tertiary">
                  add one more to compare
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Toggle button for a single configuration card */
export function CompareToggle({ slug, name }: { slug: string; name: string }) {
  const { selected, toggle } = useCompareState();
  const isSelected = selected.includes(slug);
  const isFull = selected.length >= MAX && !isSelected;

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // prevent card link navigation
        e.stopPropagation();
        toggle(slug);
      }}
      disabled={isFull}
      aria-label={isSelected ? `Remove ${name} from comparison` : `Add ${name} to comparison`}
      aria-pressed={isSelected}
      title={
        isFull
          ? `Maximum ${MAX} teams — remove one first`
          : isSelected
            ? 'Remove from comparison'
            : 'Add to comparison'
      }
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
        isSelected
          ? 'border-accent bg-accent/15 text-accent'
          : isFull
            ? 'cursor-not-allowed border-border bg-surface text-text-tertiary opacity-40'
            : 'border-border bg-surface text-text-tertiary hover:border-accent hover:text-accent'
      }`}
    >
      {isSelected ? (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          In comparison
        </>
      ) : (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Compare
        </>
      )}
    </button>
  );
}
