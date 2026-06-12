'use client';

import { useState } from 'react';
import AgentCard from '@/components/AgentCard';
import type { AgentCardData } from '@/lib/db/types';

const PAGE_SIZE = 12;

interface AgentGridProps {
  agents: AgentCardData[];
}

/**
 * Client-side incremental rendering for the agents directory.
 * Renders the first 12 cards immediately; subsequent pages load on demand
 * via a "Show more" button. Server-rendered data is passed in as props —
 * no API call is made.
 */
export default function AgentGrid({ agents }: AgentGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = agents.slice(0, visibleCount);
  const remaining = agents.length - visibleCount;

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((agent) => (
          <div key={agent.slug} className="min-w-0">
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Show more ({remaining} remaining)
          </button>
        </div>
      )}
    </>
  );
}
