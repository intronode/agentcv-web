import type { MetricRow } from '@/lib/db/types';
import { ProvenanceTag, IllustrativeMark } from '@/components/ProvenanceTag';
import { formatDate, formatMetricValue } from '@/lib/format';

export default function MetricGrid({ metrics }: { metrics: MetricRow[] }) {
  if (metrics.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
        No metrics on record yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.id} className="rounded-lg border border-border bg-surface-elevated p-4">
          <div className="text-xs text-text-tertiary">{metric.label}</div>
          <div
            className={`mt-1 text-xl font-semibold tracking-tight ${
              metric.value === null ? 'text-text-tertiary' : ''
            }`}
          >
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
  );
}
