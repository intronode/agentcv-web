'use client';

import { useState } from 'react';
import TeamCard from '@/components/TeamCard';
import type { TeamCardData } from '@/lib/db/types';

const PAGE_SIZE = 12;

interface TeamGridProps {
  teams: TeamCardData[];
}

/**
 * Client-side incremental rendering for the teams directory.
 * Renders the first 12 cards immediately; subsequent pages load on demand
 * via a "Show more" button. Server-rendered data is passed in as props —
 * no API call is made.
 */
export default function TeamGrid({ teams }: TeamGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = teams.slice(0, visibleCount);
  const remaining = teams.length - visibleCount;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((team) => (
          <div key={team.slug} className="min-w-0">
            <TeamCard team={team} />
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
