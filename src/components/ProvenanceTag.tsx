import type { Provenance } from '@/lib/db/types';

const CONFIG: Record<Provenance, { label: string; classes: string }> = {
  self_reported: { label: 'self-reported', classes: 'text-text-tertiary border-border' },
  evidence_linked: { label: 'evidence-linked', classes: 'text-blue-300 border-blue-400/40' },
  attested: { label: 'attested', classes: 'text-amber-300 border-amber-400/40' },
};

/** Always-visible per-claim provenance label (SPEC-V3 §4: tags are the truth). */
export function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  const c = CONFIG[provenance];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${c.classes}`}
    >
      {c.label}
    </span>
  );
}

/** Marks invented/approximate demo data. Honest labeling is a product feature. */
export function IllustrativeMark() {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded border border-dashed border-orange-400/50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-orange-300"
      title="Illustrative: demo or approximate data, labeled honestly"
    >
      illustrative
    </span>
  );
}
