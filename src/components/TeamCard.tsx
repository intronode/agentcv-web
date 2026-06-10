import Link from 'next/link';
import type { TeamCardData } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import { IllustrativeMark } from '@/components/ProvenanceTag';
import { formatMetricValue } from '@/lib/format';

export default function TeamCard({ team }: { team: TeamCardData }) {
  return (
    <Link href={`/teams/${team.slug}`}>
      <div className="group h-full rounded-xl border border-border bg-surface-elevated p-6 transition-all duration-200 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
              {team.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary transition-colors group-hover:text-accent">
                  {team.name}
                </h3>
                <span className="rounded border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {team.kind}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">{team.ownerName}</p>
            </div>
          </div>
          <TrustBadge tier={team.tier} size="sm" />
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {team.tagline}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {team.members.map((member) => (
            <span
              key={member.slug}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-xs text-text-secondary"
            >
              <span>{member.avatar}</span>
              <span>{member.name}</span>
              <span className="text-text-tertiary">· {member.role}</span>
            </span>
          ))}
          {team.illustrative && <IllustrativeMark />}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-border-subtle pt-4">
          {team.metrics.slice(0, 2).map((metric) => (
            <div key={metric.key} className="flex flex-col">
              <span className="text-xs text-text-tertiary">{metric.label}</span>
              <span className="text-sm font-medium">
                {formatMetricValue(metric.value, metric.unit)}
              </span>
            </div>
          ))}
          <div className="flex flex-col">
            <span className="text-xs text-text-tertiary">Members</span>
            <span className="text-sm font-medium">{team.members.length}</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-accent">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {team.proofCount} proof
          </div>
        </div>
      </div>
    </Link>
  );
}
