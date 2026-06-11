import type { SeedLayer } from '@/lib/db/types';

interface LayerLabelProps {
  layer: SeedLayer;
  sourceUrl?: string | null;
  sourceName?: string | null;
  size?: 'sm' | 'md';
}

/**
 * Always-visible layer badge. REAL = green, CURATED = blue + source link,
 * ILLUSTRATIVE = dashed orange. Never hover-only (SPEC §5).
 */
export default function LayerLabel({ layer, sourceUrl, sourceName, size = 'sm' }: LayerLabelProps) {
  const base =
    size === 'sm'
      ? 'inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide'
      : 'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide';

  if (layer === 'real') {
    return (
      <span className={`${base} border border-emerald-500/40 bg-emerald-500/10 text-emerald-300`}>
        Real
      </span>
    );
  }

  if (layer === 'curated') {
    if (sourceUrl) {
      return (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={sourceName ?? 'Source'}
          className={`${base} border border-blue-400/40 bg-blue-500/10 text-blue-300 hover:underline`}
        >
          Curated
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 opacity-70"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      );
    }
    return (
      <span className={`${base} border border-blue-400/40 bg-blue-500/10 text-blue-300`}>
        Curated
      </span>
    );
  }

  // illustrative
  return (
    <span
      className={`${base} border border-dashed border-orange-400/50 bg-orange-500/5 text-orange-300`}
      title="Illustrative: clearly-labeled demo content. Not claimed as real."
    >
      Illustrative
    </span>
  );
}
