'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType, TrustTier } from '@/lib/db/types';

interface TeamFilterBarProps {
  platforms: string[];
  topologyTypes: string[];
}

const TIERS: [TrustTier, string][] = [
  ['self_reported', 'Self-Reported'],
  ['evidence_linked', 'Evidence-Linked'],
  ['peer_attested', 'Peer-Attested'],
];

const SEED_LAYERS: [string, string][] = [
  ['real', 'Real'],
  ['curated', 'Curated'],
  ['illustrative', 'Illustrative'],
];

const AGENT_COUNT_BANDS: [string, string][] = [
  ['1-2', '1–2 agents'],
  ['3-5', '3–5 agents'],
  ['6+', '6+ agents'],
];

const SORTS: [string, string][] = [
  ['featured', 'Featured first'],
  ['recency', 'Newest'],
  ['tier', 'Trust tier'],
  ['agent_count', 'Agent count'],
];

const KNOWN_INDUSTRIES = [
  'software-delivery',
  'ops',
  'research',
  'content',
  'e-commerce',
  'customer-support',
  'data-extraction',
  'media',
];

const selectClasses =
  'rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-secondary focus:border-accent focus:outline-none';

export default function TeamFilterBar({ platforms, topologyTypes }: TeamFilterBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Count active (non-default) filters for the chip badge
  const activeCount = [
    params.get('q'),
    params.get('topology'),
    params.get('platform'),
    params.get('industry'),
    params.get('tier'),
    params.get('layer'),
    params.get('agents'),
    params.get('sort') && params.get('sort') !== 'featured' ? params.get('sort') : null,
  ].filter(Boolean).length;

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`/teams?${next.toString()}`));
  }

  const filterControls = (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
      <input
        type="search"
        placeholder="Search teams…"
        defaultValue={params.get('q') ?? ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setParam('q', e.currentTarget.value);
        }}
        className="min-w-48 flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />

      {/* Topology */}
      <select
        value={params.get('topology') ?? ''}
        onChange={(e) => setParam('topology', e.target.value)}
        className={selectClasses}
      >
        <option value="">All topologies</option>
        {topologyTypes.map((t) => (
          <option key={t} value={t}>
            {TOPOLOGY_LABELS[t as TopologyType] ?? t}
          </option>
        ))}
      </select>

      {/* Platform */}
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

      {/* Industry */}
      <select
        value={params.get('industry') ?? ''}
        onChange={(e) => setParam('industry', e.target.value)}
        className={selectClasses}
      >
        <option value="">All industries</option>
        {KNOWN_INDUSTRIES.map((ind) => (
          <option key={ind} value={ind}>
            {ind}
          </option>
        ))}
      </select>

      {/* Trust tier */}
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

      {/* Seed layer */}
      <select
        value={params.get('layer') ?? ''}
        onChange={(e) => setParam('layer', e.target.value)}
        className={selectClasses}
      >
        <option value="">All layers</option>
        {SEED_LAYERS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Agent count band */}
      <select
        value={params.get('agents') ?? ''}
        onChange={(e) => setParam('agents', e.target.value)}
        className={selectClasses}
      >
        <option value="">Any size</option>
        {AGENT_COUNT_BANDS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={params.get('sort') ?? 'featured'}
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
