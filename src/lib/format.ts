import type { MetricUnit } from '@/lib/db/types';

export function formatMetricValue(value: number | null, unit: MetricUnit): string {
  if (value === null) return '[unknown]';
  switch (unit) {
    case 'pct':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
    case 'usd':
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    case 'ms':
      return value >= 1000
        ? `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}s`
        : `${value}ms`;
    case 'days':
      return `${value.toLocaleString('en-US')}d`;
    case 'count':
      return value >= 1_000_000
        ? `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
        : value.toLocaleString('en-US');
  }
}

export function formatDate(iso: string): string {
  const [y, mo, d] = iso.split('-').map(Number);
  if (!y || !mo) return iso;
  const date = new Date(Date.UTC(y, mo - 1, d || 1));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    ...(d ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}
