'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface FilterBarProps {
  categories: string[];
  platforms: string[];
}

const TIERS = [
  ['self_reported', 'Self-Reported'],
  ['evidence_linked', 'Evidence-Linked'],
  ['peer_attested', 'Peer-Attested'],
] as const;

const SORTS = [
  ['proof', 'Most proof'],
  ['newest', 'Newest'],
  ['name', 'Name A→Z'],
] as const;

const selectClasses =
  'rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-secondary focus:border-accent focus:outline-none';

export default function FilterBar({ categories, platforms }: FilterBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Count active (non-default) filters for the chip badge
  const activeCount = [
    params.get('q'),
    params.get('category'),
    params.get('platform'),
    params.get('tier'),
    params.get('sort') && params.get('sort') !== 'proof' ? params.get('sort') : null,
  ].filter(Boolean).length;

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`/agents?${next.toString()}`));
  }

  const filterControls = (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
      <input
        type="search"
        placeholder="Search agents…"
        defaultValue={params.get('q') ?? ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setParam('q', e.currentTarget.value);
        }}
        className="min-w-48 flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
      <select
        value={params.get('category') ?? ''}
        onChange={(e) => setParam('category', e.target.value)}
        className={selectClasses}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={params.get('platform') ?? ''}
        onChange={(e) => setParam('platform', e.target.value)}
        className={selectClasses}
      >
        <option value="">All platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        value={params.get('tier') ?? ''}
        onChange={(e) => setParam('tier', e.target.value)}
        className={selectClasses}
      >
        <option value="">Any trust tier</option>
        {TIERS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={params.get('sort') ?? 'proof'}
        onChange={(e) => setParam('sort', e.target.value)}
        className={selectClasses}
      >
        {SORTS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      {/* Mobile: collapsed disclosure chip */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {mobileOpen && <div className="mt-3">{filterControls}</div>}
      </div>

      {/* Desktop: always visible */}
      <div className="hidden sm:block">{filterControls}</div>
    </div>
  );
}
