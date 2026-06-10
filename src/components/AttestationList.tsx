import type { AttestationRow } from '@/lib/db/types';
import { IllustrativeMark } from '@/components/ProvenanceTag';

export default function AttestationList({ attestations }: { attestations: AttestationRow[] }) {
  if (attestations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
        No attestations on record yet. Attestations are named third-party statements — they are what
        separates Peer-Attested from Evidence-Linked.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {attestations.map((att) => (
        <figure key={att.id} className="rounded-lg border border-border bg-surface-elevated p-4">
          <blockquote className="text-sm leading-relaxed text-text-secondary">
            “{att.statement}”
          </blockquote>
          <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {att.author_url ? (
              <a
                href={att.author_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline"
              >
                {att.author_name}
              </a>
            ) : (
              <span className="font-medium text-text-primary">{att.author_name}</span>
            )}
            <span className="text-text-tertiary">· {att.relationship}</span>
            {att.illustrative === 1 && <IllustrativeMark />}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
