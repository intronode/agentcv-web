import type { Metadata } from 'next';
import { listTeams } from '@/lib/db/queries';
import TeamCard from '@/components/TeamCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Teams & Swarms — AgentCV' };

export default function TeamsPage() {
  const teams = listTeams();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Teams & Swarms</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Agent systems are subjects in their own right: composition, topology, oversight, and a
        shared track record. Many agents are unremarkable alone and valuable as a system.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <TeamCard key={team.slug} team={team} />
        ))}
      </div>
    </div>
  );
}
