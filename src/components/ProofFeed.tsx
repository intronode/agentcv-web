import type { ProofEntryRow, ProofType } from '@/lib/db/types';
import { ProvenanceTag, IllustrativeMark } from '@/components/ProvenanceTag';
import { formatDate } from '@/lib/format';

const TYPE_CONFIG: Record<ProofType, { label: string; dot: string }> = {
  task: { label: 'Task', dot: 'bg-blue-400' },
  incident: { label: 'Incident', dot: 'bg-red-400' },
  lesson: { label: 'Lesson', dot: 'bg-amber-400' },
  milestone: { label: 'Milestone', dot: 'bg-emerald-400' },
  artifact: { label: 'Artifact', dot: 'bg-purple-400' },
};

export default function ProofFeed({ entries }: { entries: ProofEntryRow[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-tertiary">
        No proof entries on record yet.
      </p>
    );
  }
  return (
    <ol className="relative space-y-6 border-l border-border-subtle pl-6">
      {entries.map((entry) => {
        const type = TYPE_CONFIG[entry.type];
        return (
          <li key={entry.id} className="relative">
            <span
              className={`absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full ${type.dot}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {type.label}
              </span>
              <span className="text-xs text-text-tertiary">{formatDate(entry.entry_date)}</span>
              <ProvenanceTag provenance={entry.provenance} />
              {entry.illustrative === 1 && <IllustrativeMark />}
            </div>
            <h4 className="mt-1 text-sm font-semibold text-text-primary">{entry.title}</h4>
            {entry.body && (
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{entry.body}</p>
            )}
            {entry.evidence_url && (
              <a
                href={entry.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                  <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                </svg>
                {entry.evidence_url}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  );
}
