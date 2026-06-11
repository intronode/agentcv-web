import Link from 'next/link';
import type { AgentCardData } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import { IllustrativeMark } from '@/components/ProvenanceTag';
import { formatMetricValue } from '@/lib/format';

export default function AgentCard({ agent }: { agent: AgentCardData }) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <div className="group h-full rounded-xl border border-border bg-surface-elevated p-6 transition-all duration-200 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
              {agent.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary transition-colors group-hover:text-accent">
                {agent.name}
              </h3>
              <p className="text-xs text-text-tertiary">{agent.ownerName}</p>
            </div>
          </div>
          <TrustBadge tier={agent.tier} size="sm" />
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {agent.tagline}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-text-secondary">
            {agent.category}
          </span>
          <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-text-tertiary">
            {agent.platform}
          </span>
          {agent.model && (
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-text-tertiary">
              {agent.model}
            </span>
          )}
          {agent.seedLayer === 'illustrative' && <IllustrativeMark />}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-border-subtle pt-4">
          {agent.metrics.slice(0, 3).map((metric) => (
            <div key={metric.key} className="flex flex-col">
              <span className="text-xs text-text-tertiary">{metric.label}</span>
              <span className="text-sm font-medium">
                {formatMetricValue(metric.value, metric.unit)}
              </span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs">
            {agent.configurationCount > 0 && (
              <span className="flex items-center gap-1 text-text-tertiary">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                {agent.configurationCount}
              </span>
            )}
            <span className="flex items-center gap-1 text-accent">
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
              {agent.proofCount} proof
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
