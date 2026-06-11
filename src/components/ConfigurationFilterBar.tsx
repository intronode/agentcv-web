'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import type { TopologyType, TrustTier } from '@/lib/db/types';

interface ConfigurationFilterBarProps {
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

export default function ConfigurationFilterBar({
  platforms,
  topologyTypes,
}: ConfigurationFilterBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`/configurations?${next.toString()}`));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
      <input
        type="search"
        placeholder="Search configurations…"
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
}
