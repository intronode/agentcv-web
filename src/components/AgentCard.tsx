import Link from 'next/link';
import type { AgentCardData } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import { IllustrativeMark, ProvenanceTag } from '@/components/ProvenanceTag';
import { formatMetricValue } from '@/lib/format';

interface AgentCardProps {
  agent: AgentCardData;
  /**
   * When true (owner profile page): suppress the via-config metric from each card.
   * The owner page renders a shared team-metric block above the grid instead.
   */
  hideViaConfigMetric?: boolean;
}

export default function AgentCard({ agent, hideViaConfigMetric = false }: AgentCardProps) {
  return (
    <Link href={`/agents/${agent.slug}`} className="block min-w-0 w-full">
      <div className="group flex h-full min-w-0 w-full flex-col rounded-xl border border-border bg-surface-elevated p-6 transition-all duration-200 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
              {agent.avatar}
            </div>
            <div className="min-w-0">
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

        {/* Common evidence anchor — shared axis for cross-card scanning */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-border-subtle pt-3">
          <div className="min-w-0 flex flex-col">
            <span className="text-[10px] text-text-tertiary">Evidence</span>
            <span className="text-sm font-medium text-text-primary">
              {agent.proofCount} proof
              {agent.evidenceCount > 0 && (
                <span className="ml-1 text-xs font-normal text-text-tertiary">
                  · {agent.evidenceCount} linked
                </span>
              )}
            </span>
          </div>

          {/* Distinctive agent metric (own or via-config) */}
          {/* Outer wrapper: labeled slot "TOP METRIC" — mirrors TeamCard's Outcome/Economics grammar */}
          <div className="flex min-w-0 flex-col items-end gap-1">
            {(agent.metrics.length > 0 ||
              (agent.metrics.length === 0 && agent.viaConfigMetric && !hideViaConfigMetric)) && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                Top Metric
              </span>
            )}
            <div className="flex min-w-0 flex-wrap items-end justify-end gap-3">
              {agent.metrics.slice(0, 2).map((metric) => (
                <div key={metric.key} className="flex flex-col items-end">
                  <span className="text-[10px] text-text-tertiary">{metric.label}</span>
                  <span className="text-sm font-medium">
                    {formatMetricValue(metric.value, metric.unit)}
                  </span>
                </div>
              ))}
              {agent.metrics.length === 0 && agent.viaConfigMetric && !hideViaConfigMetric && (
                <div className="flex min-w-0 max-w-full flex-col items-end gap-0.5">
                  <span className="text-[10px] text-text-tertiary">
                    {agent.viaConfigMetric.label}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatMetricValue(agent.viaConfigMetric.value, agent.viaConfigMetric.unit)}
                  </span>
                  <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
                    <ProvenanceTag provenance={agent.viaConfigMetric.provenance} />
                    <span
                      className="max-w-[12rem] truncate text-[9px] text-text-tertiary"
                      title={`Team metric from configuration: ${agent.viaConfigMetric.configName}`}
                    >
                      team metric · via {agent.viaConfigMetric.configName}
                    </span>
                  </div>
                </div>
              )}
              {agent.configurationCount > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-text-tertiary">configs</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-text-secondary">
                    <svg
                      width="11"
                      height="11"
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
