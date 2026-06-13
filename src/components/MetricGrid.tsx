import Link from 'next/link';
import type { MetricRow } from '@/lib/db/types';
import { ProvenanceTag, IllustrativeMark } from '@/components/ProvenanceTag';
import { formatDate, formatMetricValue } from '@/lib/format';

/** Separate known and unknown metrics so valued ones come first and larger. */
function partitionMetrics(metrics: MetricRow[]): { valued: MetricRow[]; unknown: MetricRow[] } {
  const valued: MetricRow[] = [];
  const unknown: MetricRow[] = [];
  for (const m of metrics) {
    (m.value !== null ? valued : unknown).push(m);
  }
  return { valued, unknown };
}

export default function MetricGrid({ metrics }: { metrics: MetricRow[] }) {
  if (metrics.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
        No metrics on record yet.
      </p>
    );
  }

  const { valued, unknown } = partitionMetrics(metrics);

  return (
    <div className="space-y-3">
      {/* Valued metrics — full-size, rendered first */}
      {valued.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {valued.map((metric) => (
            <div
              key={metric.id}
              className="rounded-lg border border-border bg-surface-elevated p-4"
            >
              <div className="text-xs text-text-tertiary">{metric.label}</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                {formatMetricValue(metric.value, metric.unit)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ProvenanceTag provenance={metric.provenance} />
                {metric.illustrative === 1 && <IllustrativeMark />}
              </div>
              {metric.note && (
                <p className="mt-2 border-t border-border-subtle pt-2 text-[11px] leading-relaxed text-text-tertiary">
                  {metric.note}
                </p>
              )}
              <div className="mt-1.5 text-[10px] text-text-tertiary">
                as of {formatDate(metric.as_of)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliberately-unestimated metrics — compact row, labeled as design intent */}
      {unknown.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {unknown.map((metric) => (
            <div
              key={metric.id}
              className="rounded-lg border border-border bg-surface-elevated/60 p-4"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="min-w-0 text-xs text-text-tertiary">{metric.label}</span>
                {/* Deliberate-rigor badge */}
                <span className="shrink-0 rounded border border-dashed border-text-tertiary/30 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-text-tertiary/60">
                  not estimated
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-text-tertiary">
                {formatMetricValue(null, metric.unit)}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <ProvenanceTag provenance={metric.provenance} />
                {metric.illustrative === 1 && <IllustrativeMark />}
                {/* Why link */}
                <Link
                  href="/harness-engineering#trust-ladder"
                  className="text-[9px] text-text-tertiary/60 underline underline-offset-2 hover:text-text-tertiary"
                  title="Why we don't invent numbers we haven't reconciled"
                >
                  why?
                </Link>
              </div>
              {/* Note renders as the designed explanation, not just fine print */}
              {metric.note ? (
                <p className="mt-2 border-t border-border-subtle pt-2 text-[11px] leading-relaxed text-text-secondary">
                  {metric.note}
                </p>
              ) : (
                <p className="mt-2 border-t border-border-subtle pt-2 text-[11px] leading-relaxed text-text-tertiary/70">
                  Deliberately not estimated — we publish what we can stand behind.
                </p>
              )}
              <div className="mt-1.5 text-[10px] text-text-tertiary">
                as of {formatDate(metric.as_of)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
