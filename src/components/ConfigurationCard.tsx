import Link from 'next/link';
import type { ConfigurationCardData } from '@/lib/db/types';
import TrustBadge from '@/components/TrustBadge';
import LayerLabel from '@/components/LayerLabel';
import TopologyGlyph, { TOPOLOGY_LABELS } from '@/components/TopologyGlyph';
import { CompareToggle } from '@/components/CompareTray';
import { formatMetricValue } from '@/lib/format';

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

        {/* Metrics footer */}
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-4 border-t border-border-subtle pt-3">
            {config.metrics.slice(0, 2).map((metric) => {
              const isUnknown = metric.value === null;
              // For null metrics on cards: show a compact qualifier if the note is short
              // enough to fit inline (≤40 chars), otherwise use a generic "windowed data" hint.
              const noteShort = metric.note && metric.note.length <= 40 ? metric.note : null;
              const unknownSubtext = noteShort ?? 'windowed data · see detail';
              return (
                <div key={metric.key} className="flex flex-col">
                  <span className="text-[10px] text-text-tertiary">{metric.label}</span>
                  {isUnknown ? (
                    <span
                      className="text-[11px] font-medium text-text-tertiary"
                      title={metric.note ?? 'Not on record — an honest gap.'}
                    >
                      <span className="font-mono text-[10px]">[unknown]</span>
                      <span className="ml-1 text-[9px] text-text-tertiary/70">
                        {unknownSubtext}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-text-primary">
                      {formatMetricValue(metric.value, metric.unit)}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-1 text-xs text-accent">
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
