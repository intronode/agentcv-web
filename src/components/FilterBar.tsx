'use client';

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

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`/agents?${next.toString()}`));
  }

  return (
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
}
