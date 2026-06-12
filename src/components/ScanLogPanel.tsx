'use client';

/**
 * ScanLogPanel — shows the 5 most recent scan log entries for a file.
 * Spec: SANITIZER.md §8 (scan log surface)
 * Owner-only component; server decides whether to render it.
 */

import { useState } from 'react';
import type { FileScanLogRow } from '@/lib/db/types';

interface ScanLogPanelProps {
  entries: FileScanLogRow[];
}

const TRIGGER_LABEL: Record<FileScanLogRow['triggered_by'], string> = {
  content_change: 'Content change',
  manual_rescan: 'Manual rescan',
  visibility_attempt: 'Visibility attempt',
  seed_review: 'Seed review',
};

export function ScanLogPanel({ entries }: ScanLogPanelProps) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="mt-8 border border-zinc-800 rounded">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-zinc-200 transition-colors"
        aria-expanded={open}
      >
        <span>Scan log</span>
        <span className="text-zinc-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {entries.map((entry) => {
            let versions: Record<string, string> = {};
            try {
              versions = JSON.parse(entry.detector_versions) as Record<string, string>;
            } catch {
              // ignore parse errors
            }
            return (
              <div key={entry.id} className="px-4 py-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-zinc-300 font-mono">{entry.scan_ts}</span>
                  <span className="text-zinc-500">
                    {TRIGGER_LABEL[entry.triggered_by] ?? entry.triggered_by}
                  </span>
                  <span className={entry.error_message ? 'text-red-400' : 'text-green-400'}>
                    {entry.error_message
                      ? `Error: ${entry.error_message}`
                      : `${entry.finding_count} finding${entry.finding_count !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {Object.keys(versions).length > 0 && (
                  <div className="mt-1 text-zinc-600">
                    Detectors:{' '}
                    {Object.entries(versions)
                      .map(([k, v]) => `${k}@${v}`)
                      .join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
