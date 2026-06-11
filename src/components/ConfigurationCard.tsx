import Link from 'next/link';
import type { ConfigurationCardData } from '@/lib/db/types';
import type { MetricRow } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import LayerLabel from '@/components/LayerLabel';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import { CompareToggle } from '@/components/CompareTray';
import { formatMetricValue } from '@/lib/format';

// ---------------------------------------------------------------------------
// Metric slot assignment — deterministic, documented rule:
//
//   Slot 1 "Outcome": first metric whose key appears in OUTCOME_KEYS.
//     Captures task-success, benchmark, accuracy, or win-rate figures.
//     Signals "does this configuration actually work?"
//
//   Slot 2 "Economics": first metric whose key appears in ECONOMICS_KEYS.
//     Captures cost, token, latency, or throughput figures.
//     Signals "how expensive / fast is it?"
//
//   Fallback: if a slot has no matching metric, show an em-dash with the
//   label "— not stated" so the card always has two labeled cells.
//   Provenance tags are preserved when the metric has one.
// ---------------------------------------------------------------------------
const OUTCOME_KEYS = new Set([
  'success_rate',
  'gaia_score',
  'webarena_score',
  'human_eval_fix',
  'win_rate_pct',
  'trueskill_rating',
  'executability_score',
  'assistantbench_score',
  'items_multiplier',
  'tech_tree_speed',
  'distance_multiplier',
  'alfworld_gain',
  'tool_tasks_completed',
  'window_reconciliation_pct',
  'uptime_pct',
  'mbpp_score',
  'gpt4_eval_win_rate',
  'claude_35_both_score',
  'cost_reduction_heterogeneous',
  'prior_sota_pct',
]);

const ECONOMICS_KEYS = new Set([
  'cost_per_task_usd',
  'cost_reduction',
  'tokens_per_loc',
  'avg_response_ms',
  'tasks_completed',
  'codebase_loc',
]);

function pickSlot(metrics: MetricRow[], keySet: Set<string>): MetricRow | null {
  return metrics.find((m) => keySet.has(m.key)) ?? null;
}

function IndustryTag({ label }: { label: string }) {
  return (
    <span className="rounded bg-surface px-1.5 py-px text-[10px] font-medium text-text-tertiary">
      {label}
    </span>
  );
}

export default function ConfigurationCard({ config }: { config: ConfigurationCardData }) {
  return (
    <Link href={`/configurations/${config.slug}`} className="group block h-full">
      <article className="flex h-full flex-col rounded-xl border border-border bg-surface-elevated p-5 transition-all duration-200 hover:border-border hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
              {config.avatar}
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold text-text-primary transition-colors group-hover:text-accent">
                {config.name}
              </h3>
              <p className="text-xs text-text-tertiary">{config.ownerName}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <TrustBadge tier={config.tier} size="sm" />
            <LayerLabel layer={config.seedLayer} size="sm" />
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {config.tagline}
        </p>

        {/* Comparable spec row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle pt-3">
          {config.topologyType && (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <TopologyGlyph
                topology={config.topologyType}
                size={14}
                className="shrink-0 text-accent"
              />
              {TOPOLOGY_LABELS[config.topologyType]}
            </span>
          )}
          {config.agentCount !== null && (
            <span className="text-xs text-text-secondary">
              <span className="font-medium text-text-primary">{config.agentCount}</span>{' '}
              {config.agentCount === 1 ? 'agent' : 'agents'}
            </span>
          )}
          {config.platform && <span className="text-xs text-text-tertiary">{config.platform}</span>}
        </div>

        {/* Role → model pills (up to 4 members) */}
        {config.members.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {config.members.slice(0, 4).map((member) => (
              <span
                key={member.slug}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary"
              >
                <span className="font-medium text-text-primary">{member.role}</span>
                {member.model && <span className="text-text-tertiary">· {member.model}</span>}
              </span>
            ))}
            {config.members.length > 4 && (
              <span className="inline-flex items-center rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-tertiary">
                +{config.members.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Industries */}
        {config.industries.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {config.industries.slice(0, 4).map((ind) => (
              <IndustryTag key={ind} label={ind} />
            ))}
          </div>
        )}

        {/* Metrics footer — two deterministic labeled slots: Outcome + Economics.
            Slot assignment rule: see OUTCOME_KEYS / ECONOMICS_KEYS comment above. */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-subtle pt-3">
            {(['Outcome', 'Economics'] as const).map((slotLabel) => {
              const keySet = slotLabel === 'Outcome' ? OUTCOME_KEYS : ECONOMICS_KEYS;
              const metric = pickSlot(config.metrics, keySet);
              const isUnknown = metric === null || metric.value === null;
              return (
                <div key={slotLabel} className="flex shrink-0 flex-col">
                  <span className="text-[10px] text-text-tertiary">{slotLabel}</span>
                  {metric && !isUnknown ? (
                    <span className="text-sm font-semibold text-text-primary" title={metric.label}>
                      {formatMetricValue(metric.value, metric.unit)}
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-medium text-text-tertiary"
                      title="Not stated for this configuration"
                    >
                      — <span className="text-[9px] text-text-tertiary/70">not stated</span>
                    </span>
                  )}
                </div>
              );
            })}
            <div className="ml-auto flex shrink-0 items-center gap-1 text-xs text-accent">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {config.proofCount} proof
            </div>
          </div>
          {/* Compare toggle — client state, does not navigate the card link */}
          <div className="mt-2.5">
            <CompareToggle slug={config.slug} name={config.name} />
          </div>
        </div>
      </article>
    </Link>
  );
}
