import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfigurationsForCompare } from '@/lib/db/queries';
import type { ConfigurationCompareData } from '@/lib/db/queries';
import type { MetricRow } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import LayerLabel from '@/components/LayerLabel';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import { ProvenanceTag } from '@/components/ProvenanceTag';
import { formatMetricValue, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare Configurations — AgentCV',
  description:
    'Side-by-side comparison of agent configurations — topology, roster, metrics, and evidence.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSlugs(raw: string | string[] | undefined): string[] {
  const str = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

// Build a union of all metric keys across columns, preserving insertion order
function unionMetricKeys(configs: ConfigurationCompareData[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const c of configs) {
    for (const m of c.metrics) {
      if (!seen.has(m.key)) {
        seen.add(m.key);
        keys.push(m.key);
      }
    }
  }
  return keys;
}

function getMetric(metrics: MetricRow[], key: string): MetricRow | undefined {
  return metrics.find((m) => m.key === key);
}

// Cell value differs from at least one other column
function cellDiffers(configs: ConfigurationCompareData[], key: string, thisValue: string): boolean {
  const values = configs.map((c) => {
    const m = getMetric(c.metrics, key);
    return m ? formatMetricValue(m.value, m.unit) : '[unknown]';
  });
  return values.some((v) => v !== thisValue);
}

// ---- Shared cell classes ---------------------------------------------------
const HEADER_CELL =
  'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary';
const ROW_LABEL =
  'sticky left-0 z-10 min-w-[120px] bg-surface px-4 py-3 text-xs font-medium text-text-tertiary align-top';
const VALUE_CELL = 'px-4 py-3 text-sm text-text-secondary align-top';
const DIFF_CELL = 'px-4 py-3 text-sm text-text-primary align-top font-medium';

function diffClass(differs: boolean) {
  return differs ? DIFF_CELL : VALUE_CELL;
}

// ---- Subcomponents ---------------------------------------------------------

function UnknownCell({ reason }: { reason?: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary"
      title={reason ?? 'Not on record — an honest gap.'}
    >
      [unknown]
    </span>
  );
}

function MetricCell({ metric, differs }: { metric: MetricRow | undefined; differs: boolean }) {
  if (!metric) {
    return (
      <td className={VALUE_CELL}>
        <UnknownCell reason="No metric on record for this configuration." />
      </td>
    );
  }
  const displayValue = formatMetricValue(metric.value, metric.unit);
  const isUnknown = metric.value === null;
  return (
    <td className={isUnknown ? VALUE_CELL : differs ? DIFF_CELL : VALUE_CELL}>
      {isUnknown ? <UnknownCell reason={metric.note} /> : <span>{displayValue}</span>}
      {!isUnknown && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <ProvenanceTag provenance={metric.provenance} />
          {metric.as_of && (
            <span className="text-[10px] text-text-tertiary">as of {formatDate(metric.as_of)}</span>
          )}
        </div>
      )}
      {metric.note && (
        <p className="mt-1 text-[10px] leading-relaxed text-text-tertiary">{metric.note}</p>
      )}
    </td>
  );
}

// ---- Mobile metric cell (div-based, used in the stacked mobile layout) -----
function MetricCellMobile({ metric }: { metric: MetricRow | undefined }) {
  if (!metric) {
    return <UnknownCell reason="No metric on record for this configuration." />;
  }
  const displayValue = formatMetricValue(metric.value, metric.unit);
  const isUnknown = metric.value === null;
  return (
    <div>
      {isUnknown ? (
        <UnknownCell reason={metric.note} />
      ) : (
        <span className="text-sm font-medium text-text-primary">{displayValue}</span>
      )}
      {!isUnknown && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <ProvenanceTag provenance={metric.provenance} />
        </div>
      )}
    </div>
  );
}

// ---- Suggested pairs for empty state ----------------------------------------
const SUGGESTED_PAIRS = [
  {
    label: 'Flagship vs benchmark',
    ids: 'ari-collective,magentic-one',
  },
  {
    label: 'Two software pipelines',
    ids: 'metagpt-pipeline,chatdev-pipeline',
  },
  {
    label: 'Flagship + two benchmarks',
    ids: 'ari-collective,magentic-one,metagpt-pipeline',
  },
  {
    label: 'Hub-and-spoke vs pipeline',
    ids: 'ari-collective,crewai-research-crew',
  },
];

// ---- Mobile grouped-row layout ---------------------------------------------
//
// Renders all configs' values for each field in a compact stacked block
// so nothing requires horizontal scrolling at 390 px.  Each "field group"
// shows:
//   [field label row]
//   [N-column grid: glyph+short-name header | value] × N configs
//
// The config micro-headers (avatar + truncated name) repeat for every group
// so the reader never loses track of which column is which.

interface MobileFieldRowProps {
  label: string;
  configs: ConfigurationCompareData[];
  children: (c: ConfigurationCompareData, idx: number) => React.ReactNode;
}

function MobileFieldRow({ label, configs, children }: MobileFieldRowProps) {
  return (
    <div className="border-b border-border-subtle py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <div
        className="grid gap-x-2 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${configs.length}, minmax(0, 1fr))` }}
      >
        {configs.map((c, idx) => (
          <div key={c.configuration.slug} className="min-w-0">
            {/* Micro-header: avatar + truncated name */}
            <div className="mb-1 flex items-center gap-1">
              <span className="shrink-0 text-base leading-none">{c.configuration.avatar}</span>
              <span className="truncate text-[10px] font-medium text-text-tertiary">
                {c.configuration.name.length > 16
                  ? c.configuration.name.slice(0, 15) + '…'
                  : c.configuration.name}
              </span>
            </div>
            {/* Value */}
            <div className="text-sm text-text-secondary">{children(c, idx)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedSlugs = getSlugs(params.ids);
  const configs = getConfigurationsForCompare(requestedSlugs);

  const droppedSlugs = requestedSlugs.filter(
    (s) => !configs.some((c) => c.configuration.slug === s)
  );

  // ---- Empty / insufficient state ------------------------------------------
  if (configs.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Compare</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Side-by-side configuration comparison
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary">
          Select 2–3 configurations from the directory and compare their topology, roster,
          industries, metrics, and evidence head-to-head. Honest [unknown] cells are never hidden —
          a gap in a comparison row is as informative as a number.
        </p>

        <h2 className="mt-10 text-sm font-semibold text-text-primary">Try a comparison</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {SUGGESTED_PAIRS.map(({ label, ids }) => (
            <Link
              key={ids}
              href={`/compare?ids=${ids}`}
              className="rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/configurations"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Browse configurations to build your own comparison
          </Link>
        </div>
      </div>
    );
  }

  // ---- Build comparison rows -----------------------------------------------
  const metricKeys = unionMetricKeys(configs);
  const colCount = configs.length;
  const colWidth = colCount === 3 ? 'min-w-[200px]' : 'min-w-[260px]';

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Compare</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Comparing {configs.length} configurations
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
          Row-aligned side-by-side. Highlighted cells differ across columns.{' '}
          <span className="text-text-tertiary">[unknown] cells are honest gaps, never hidden.</span>
        </p>
      </div>

      {/* Dropped slug notice */}
      {droppedSlugs.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-text-tertiary"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-xs text-text-tertiary">
            Slug{droppedSlugs.length > 1 ? 's' : ''} not found and dropped:{' '}
            <span className="font-mono text-text-secondary">{droppedSlugs.join(', ')}</span>
          </span>
        </div>
      )}

      {/* ================================================================
          MOBILE LAYOUT  (< md breakpoint, i.e. < 768 px)
          Per-field grouped rows — all configs visible simultaneously,
          no horizontal scroll required at 390 px.
          ================================================================ */}
      <div className="block md:hidden">
        {/* Config identity strip — shows all configs at a glance */}
        <div
          className="mb-4 grid gap-2 rounded-xl border border-border bg-surface-elevated p-3"
          style={{ gridTemplateColumns: `repeat(${configs.length}, minmax(0, 1fr))` }}
        >
          {configs.map((c) => (
            <div
              key={c.configuration.slug}
              className="flex flex-col items-center gap-1 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-xl">
                {c.configuration.avatar}
              </div>
              <Link
                href={`/configurations/${c.configuration.slug}`}
                className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-primary hover:text-accent"
              >
                {c.configuration.name}
              </Link>
              <div className="flex flex-wrap justify-center gap-1">
                <TrustBadge tier={c.tier} size="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Field groups */}
        <div className="rounded-xl border border-border bg-surface px-4">
          {/* Topology */}
          <MobileFieldRow label="Topology" configs={configs}>
            {(c) =>
              c.configuration.topology_type ? (
                <span className="inline-flex items-center gap-1">
                  <TopologyGlyph
                    topology={c.configuration.topology_type}
                    size={12}
                    className="shrink-0 text-accent"
                  />
                  <span className="text-xs">{TOPOLOGY_LABELS[c.configuration.topology_type]}</span>
                </span>
              ) : (
                <UnknownCell />
              )
            }
          </MobileFieldRow>

          {/* Agents */}
          <MobileFieldRow label="Agents" configs={configs}>
            {(c) =>
              c.configuration.agent_count !== null ? (
                <span className="text-xs">
                  <span className="font-semibold text-text-primary">
                    {c.configuration.agent_count}
                  </span>{' '}
                  {c.configuration.agent_count === 1 ? 'agent' : 'agents'}
                </span>
              ) : (
                <UnknownCell />
              )
            }
          </MobileFieldRow>

          {/* Platform */}
          <MobileFieldRow label="Platform" configs={configs}>
            {(c) =>
              c.configuration.platform ? (
                <span className="text-xs">{c.configuration.platform}</span>
              ) : (
                <UnknownCell />
              )
            }
          </MobileFieldRow>

          {/* Roster */}
          <MobileFieldRow label="Roster" configs={configs}>
            {(c) =>
              c.members.length === 0 ? (
                <UnknownCell reason="No roster on record." />
              ) : (
                <ul className="space-y-0.5">
                  {c.members.map((m) => (
                    <li key={`${m.slug}-${m.role}`} className="text-[11px] leading-snug">
                      <Link
                        href={`/agents/${m.slug}`}
                        className="font-medium text-text-primary hover:text-accent"
                      >
                        {m.name}
                      </Link>
                      <span className="text-text-tertiary"> · {m.role}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </MobileFieldRow>

          {/* Industries */}
          <MobileFieldRow label="Industries" configs={configs}>
            {(c) => {
              const industries = c.configuration.industries
                ? (JSON.parse(c.configuration.industries) as string[])
                : [];
              return industries.length === 0 ? (
                <UnknownCell />
              ) : (
                <div className="flex flex-wrap gap-0.5">
                  {industries.slice(0, 3).map((ind) => (
                    <span
                      key={ind}
                      className="rounded bg-surface-elevated px-1 py-px text-[10px] text-text-secondary"
                    >
                      {ind}
                    </span>
                  ))}
                  {industries.length > 3 && (
                    <span className="text-[10px] text-text-tertiary">+{industries.length - 3}</span>
                  )}
                </div>
              );
            }}
          </MobileFieldRow>

          {/* Task kinds */}
          <MobileFieldRow label="Task kinds" configs={configs}>
            {(c) => {
              const kinds = c.configuration.task_kinds
                ? (JSON.parse(c.configuration.task_kinds) as string[])
                : [];
              return kinds.length === 0 ? (
                <UnknownCell />
              ) : (
                <div className="flex flex-wrap gap-0.5">
                  {kinds.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="rounded border border-border bg-surface px-1 py-px text-[10px] text-text-tertiary"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              );
            }}
          </MobileFieldRow>

          {/* Operating since */}
          <MobileFieldRow label="Operating since" configs={configs}>
            {(c) =>
              c.configuration.operational_since ? (
                <span className="text-xs">{formatDate(c.configuration.operational_since)}</span>
              ) : (
                <UnknownCell />
              )
            }
          </MobileFieldRow>

          {/* Trust tier */}
          <MobileFieldRow label="Trust tier" configs={configs}>
            {(c) => <TrustBadge tier={c.tier} size="sm" />}
          </MobileFieldRow>

          {/* Proof entries */}
          <MobileFieldRow label="Proof entries" configs={configs}>
            {(c) =>
              c.proofCount === 0 ? (
                <UnknownCell reason="No proof entries on record." />
              ) : (
                <span className="text-xs">
                  <span className="font-semibold text-text-primary">{c.proofCount}</span> total
                  {c.evidenceCount > 0 && (
                    <span className="block text-[10px] text-blue-300">
                      {c.evidenceCount} with links
                    </span>
                  )}
                </span>
              )
            }
          </MobileFieldRow>

          {/* Oversight */}
          <MobileFieldRow label="Oversight" configs={configs}>
            {(c) =>
              c.configuration.oversight ? (
                <span className="text-xs leading-relaxed">{c.configuration.oversight}</span>
              ) : (
                <UnknownCell />
              )
            }
          </MobileFieldRow>

          {/* Source */}
          <MobileFieldRow label="Source" configs={configs}>
            {(c) => (
              <LayerLabel
                layer={c.configuration.seed_layer}
                sourceUrl={c.configuration.source_url}
                sourceName={c.configuration.source_name}
                size="sm"
              />
            )}
          </MobileFieldRow>

          {/* Metric rows */}
          {metricKeys.length > 0 && (
            <div className="border-b border-border py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Metrics
              </span>
            </div>
          )}
          {metricKeys.map((key) => {
            const label =
              configs.flatMap((c) => c.metrics).find((m) => m.key === key)?.label ?? key;
            return (
              <MobileFieldRow key={key} label={label} configs={configs}>
                {(c) => {
                  const metric = getMetric(c.metrics, key);
                  return <MetricCellMobile metric={metric} />;
                }}
              </MobileFieldRow>
            );
          })}
        </div>

        {/* Action row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/configurations"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to directory
          </Link>
          <div className="flex flex-wrap gap-2 text-sm text-text-tertiary">
            {configs.map((c) => (
              <Link
                key={c.configuration.slug}
                href={`/configurations/${c.configuration.slug}`}
                className="rounded border border-border px-3 py-1.5 hover:text-text-primary"
              >
                Open {c.configuration.name} →
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================
          DESKTOP LAYOUT  (>= md breakpoint)
          Unchanged horizontal table layout.
          ================================================================ */}
      <div className="hidden md:block">
        {/* Comparison table */}
        <div className="relative">
          <div
            className="overflow-x-auto rounded-xl border border-border"
            style={{ scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
          >
            <table className="w-full border-collapse text-left">
              {/* ---- Column headers (sticky) ---- */}
              <thead>
                <tr className="border-b border-border bg-surface">
                  {/* Row label column */}
                  <th className={`${HEADER_CELL} sticky left-0 z-20 bg-surface min-w-[120px]`}>
                    Field
                  </th>
                  {configs.map((c) => (
                    <th
                      key={c.configuration.slug}
                      className={`${HEADER_CELL} ${colWidth} border-l border-border`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xl">
                          {c.configuration.avatar}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/configurations/${c.configuration.slug}`}
                            className="block line-clamp-2 overflow-hidden text-sm font-semibold text-text-primary hover:text-accent"
                            title={c.configuration.name}
                          >
                            {c.configuration.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <TrustBadge tier={c.tier} size="sm" />
                            <LayerLabel
                              layer={c.configuration.seed_layer}
                              sourceUrl={c.configuration.source_url}
                              sourceName={c.configuration.source_name}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* ---- Topology type ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Topology</td>
                  {configs.map((c) => {
                    const val = c.configuration.topology_type
                      ? TOPOLOGY_LABELS[c.configuration.topology_type]
                      : null;
                    const allVals = configs.map((x) =>
                      x.configuration.topology_type
                        ? TOPOLOGY_LABELS[x.configuration.topology_type]
                        : null
                    );
                    const differs = val !== null && allVals.some((v) => v !== val);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        {c.configuration.topology_type ? (
                          <span className="inline-flex items-center gap-1.5">
                            <TopologyGlyph
                              topology={c.configuration.topology_type}
                              size={14}
                              className="shrink-0 text-accent"
                            />
                            {TOPOLOGY_LABELS[c.configuration.topology_type]}
                          </span>
                        ) : (
                          <UnknownCell />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Agent count ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Agents</td>
                  {configs.map((c) => {
                    const val = c.configuration.agent_count;
                    const allVals = configs.map((x) => x.configuration.agent_count);
                    const differs = val !== null && allVals.some((v) => v !== val);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        {val !== null ? (
                          <span>
                            {val} {val === 1 ? 'agent' : 'agents'}
                          </span>
                        ) : (
                          <UnknownCell />
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Platform ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Platform</td>
                  {configs.map((c) => {
                    const val = c.configuration.platform;
                    const allVals = configs.map((x) => x.configuration.platform);
                    const differs = !!val && allVals.some((v) => v !== val);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        {val ?? <UnknownCell />}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Roster ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Roster</td>
                  {configs.map((c) => (
                    <td
                      key={c.configuration.slug}
                      className={`border-l border-border-subtle ${VALUE_CELL}`}
                    >
                      {c.members.length === 0 ? (
                        <UnknownCell reason="No roster on record." />
                      ) : (
                        <ul className="space-y-1">
                          {c.members.map((m) => (
                            <li key={`${m.slug}-${m.role}`} className="flex items-center gap-1.5">
                              <Link
                                href={`/agents/${m.slug}`}
                                className="font-medium text-text-primary hover:text-accent"
                              >
                                {m.name}
                              </Link>
                              <span className="text-text-tertiary">·</span>
                              <span className="text-text-secondary">{m.role}</span>
                              {m.model && (
                                <>
                                  <span className="text-text-tertiary">·</span>
                                  <span className="font-mono text-[11px] text-text-tertiary">
                                    {m.model}
                                  </span>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>

                {/* ---- Industries ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Industries</td>
                  {configs.map((c) => {
                    const industries = c.configuration.industries
                      ? (JSON.parse(c.configuration.industries) as string[])
                      : [];
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${VALUE_CELL}`}
                      >
                        {industries.length === 0 ? (
                          <UnknownCell />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {industries.map((ind) => (
                              <span
                                key={ind}
                                className="rounded bg-surface px-1.5 py-px text-[11px] text-text-secondary"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Task kinds ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Task kinds</td>
                  {configs.map((c) => {
                    const kinds = c.configuration.task_kinds
                      ? (JSON.parse(c.configuration.task_kinds) as string[])
                      : [];
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${VALUE_CELL}`}
                      >
                        {kinds.length === 0 ? (
                          <UnknownCell />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {kinds.map((k) => (
                              <span
                                key={k}
                                className="rounded border border-border bg-surface px-1.5 py-px text-[11px] text-text-tertiary"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Operating since ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Operating since</td>
                  {configs.map((c) => {
                    const val = c.configuration.operational_since;
                    const allVals = configs.map((x) => x.configuration.operational_since);
                    const differs = !!val && allVals.some((v) => v !== val);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        {val ? formatDate(val) : <UnknownCell />}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Trust tier ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Trust tier</td>
                  {configs.map((c) => {
                    const allTiers = configs.map((x) => x.tier);
                    const differs = allTiers.some((t) => t !== c.tier);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        <TrustBadge tier={c.tier} size="md" />
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Proof entries ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Proof entries</td>
                  {configs.map((c) => {
                    const total = c.proofCount;
                    const evidenced = c.evidenceCount;
                    const allTotals = configs.map((x) => x.proofCount);
                    const differs = allTotals.some((t) => t !== total);
                    return (
                      <td
                        key={c.configuration.slug}
                        className={`border-l border-border-subtle ${differs ? DIFF_CELL : VALUE_CELL}`}
                      >
                        {total === 0 ? (
                          <UnknownCell reason="No proof entries on record." />
                        ) : (
                          <span>
                            {total} total
                            {evidenced > 0 && (
                              <span className="ml-1.5 text-[11px] text-blue-300">
                                ({evidenced} with external links)
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ---- Oversight ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Oversight</td>
                  {configs.map((c) => (
                    <td
                      key={c.configuration.slug}
                      className={`border-l border-border-subtle ${VALUE_CELL}`}
                    >
                      {c.configuration.oversight ? (
                        <span className="text-sm leading-relaxed text-text-secondary">
                          {c.configuration.oversight}
                        </span>
                      ) : (
                        <UnknownCell />
                      )}
                    </td>
                  ))}
                </tr>

                {/* ---- Source layer ---- */}
                <tr className="border-b border-border-subtle hover:bg-surface/40">
                  <td className={ROW_LABEL}>Source</td>
                  {configs.map((c) => (
                    <td
                      key={c.configuration.slug}
                      className={`border-l border-border-subtle ${VALUE_CELL}`}
                    >
                      <LayerLabel
                        layer={c.configuration.seed_layer}
                        sourceUrl={c.configuration.source_url}
                        sourceName={c.configuration.source_name}
                        size="md"
                      />
                      {c.configuration.source_name && !c.configuration.source_url && (
                        <p className="mt-1 text-[11px] text-text-tertiary">
                          {c.configuration.source_name}
                        </p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* ---- Dynamic metric rows (union of all keys) ---- */}
                {metricKeys.length > 0 && (
                  <tr className="border-b border-border bg-surface">
                    <td
                      colSpan={configs.length + 1}
                      className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary"
                    >
                      Metrics
                    </td>
                  </tr>
                )}
                {metricKeys.map((key) => {
                  const label =
                    configs.flatMap((c) => c.metrics).find((m) => m.key === key)?.label ?? key;
                  return (
                    <tr key={key} className="border-b border-border-subtle hover:bg-surface/40">
                      <td className={ROW_LABEL}>{label}</td>
                      {configs.map((c) => {
                        const metric = getMetric(c.metrics, key);
                        const thisDisplay = metric
                          ? formatMetricValue(metric.value, metric.unit)
                          : '[unknown]';
                        const differs = cellDiffers(configs, key, thisDisplay);
                        return (
                          <MetricCell
                            key={c.configuration.slug}
                            metric={metric}
                            differs={differs}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/configurations"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to directory
          </Link>
          <div className="flex flex-wrap gap-2 text-sm text-text-tertiary">
            {configs.map((c) => (
              <Link
                key={c.configuration.slug}
                href={`/configurations/${c.configuration.slug}`}
                className="rounded border border-border px-3 py-1.5 hover:text-text-primary"
              >
                Open {c.configuration.name} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
