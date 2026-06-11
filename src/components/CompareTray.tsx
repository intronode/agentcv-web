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

/** The floating tray that appears when ≥1 configuration is selected */
export function CompareTray() {
  const { selected, clear } = useCompareState();

  if (selected.length === 0) return null;

  const compareUrl = `/compare?ids=${selected.join(',')}`;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface shadow-xl shadow-black/30 px-4 py-3 backdrop-blur-md">
        <span className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{selected.length}</span> selected
          {selected.length < MAX && (
            <span className="ml-1 text-text-tertiary">
              (add {MAX - selected.length} more to compare up to {MAX})
            </span>
          )}
        </span>

        <button
          onClick={clear}
          className="text-xs text-text-tertiary hover:text-text-secondary"
          aria-label="Clear selection"
        >
          Clear
        </button>

        <Link
          href={compareUrl}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            selected.length >= 2
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'cursor-not-allowed bg-surface-elevated text-text-tertiary'
          }`}
          aria-disabled={selected.length < 2}
          onClick={(e) => {
            if (selected.length < 2) e.preventDefault();
          }}
        >
          Compare {selected.length}
        </Link>
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
          ? `Maximum ${MAX} configurations — remove one first`
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
