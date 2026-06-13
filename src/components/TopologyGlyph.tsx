import type { TopologyType } from '@/lib/db/types';

interface GlyphProps {
  size?: number;
  className?: string;
}

/**
 * Hub-and-spoke: central node with 4 radial nodes connected.
 * Represents Ari Collective and similar orchestrator patterns.
 */
function HubAndSpokeGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Orchestrator-worker topology"
      className={className}
    >
      {/* spokes */}
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="3"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* satellite nodes */}
      <circle cx="12" cy="3" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="21" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="21" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="3" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
      {/* hub */}
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * Pipeline: left-to-right chain of nodes.
 * Represents sequential processing patterns.
 */
function PipelineGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Pipeline topology"
      className={className}
    >
      {/* connectors */}
      <line
        x1="5.5"
        y1="12"
        x2="9"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="12"
        x2="18.5"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* arrow head */}
      <polyline
        points="16.5,9.5 19,12 16.5,14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* nodes */}
      <circle cx="4" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="20" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Peer: fully connected mesh of equal nodes.
 * Represents collaborative/autonomous peer patterns.
 */
function PeerGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Swarm topology"
      className={className}
    >
      {/* connections */}
      <line
        x1="12"
        y1="4"
        x2="20"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="4"
        x2="4"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* nodes */}
      <circle cx="12" cy="4" r="2.5" fill="currentColor" />
      <circle cx="20" cy="18" r="2.5" fill="currentColor" />
      <circle cx="4" cy="18" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Hierarchical: tree with root → branches → leaves.
 * Represents manager/worker, supervisor patterns.
 */
function HierarchicalGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Supervisor topology"
      className={className}
    >
      {/* root → mid-level */}
      <line
        x1="12"
        y1="5.5"
        x2="7"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="5.5"
        x2="17"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* mid → leaves */}
      <line
        x1="7"
        y1="15.5"
        x2="4"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="7"
        y1="15.5"
        x2="10"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="17"
        y1="15.5"
        x2="14"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="17"
        y1="15.5"
        x2="20"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* nodes */}
      <circle cx="12" cy="4" r="2" fill="currentColor" />
      <circle cx="7" cy="14" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="4" cy="21" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="10" cy="21" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="14" cy="21" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="20" cy="21" r="1.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/**
 * Solo + tools: single agent with tool connections radiating outward.
 * Represents tool-augmented single-agent patterns.
 */
function SoloPlusToolsGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Solo plus tools topology"
      className={className}
    >
      {/* tool spokes (dashed) */}
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
        opacity="0.6"
      />
      <line
        x1="12"
        y1="9"
        x2="18.5"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
        opacity="0.6"
      />
      <line
        x1="12"
        y1="15"
        x2="18.5"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
        opacity="0.6"
      />
      <line
        x1="12"
        y1="15"
        x2="5.5"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
        opacity="0.6"
      />
      <line
        x1="12"
        y1="9"
        x2="5.5"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="1.5 1.5"
        opacity="0.6"
      />
      {/* tool nodes (squares) */}
      <rect x="10.5" y="2" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="17" y="6.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="17" y="14.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="4" y="14.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="4" y="6.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
      {/* agent */}
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Other: generic graph/network symbol.
 */
function OtherGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Other topology"
      className={className}
    >
      <circle cx="6" cy="8" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="18" cy="8" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="6" cy="16" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="18" cy="16" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <line
        x1="7.4"
        y1="9"
        x2="10.7"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="16.6"
        y1="9"
        x2="13.3"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="7.4"
        y1="15"
        x2="10.7"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="16.6"
        y1="15"
        x2="13.3"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="10"
        x2="6"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="18"
        y1="10"
        x2="18"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Router: central routing node with conditional branches.
 * Represents intent-routing and conditional dispatch patterns.
 */
function RouterGlyph({ size = 24, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Router topology"
      className={className}
    >
      {/* router hub */}
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      {/* branch lines */}
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="14.6"
        y1="13.5"
        x2="19.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9.4"
        y1="13.5"
        x2="4.5"
        y2="17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* branch endpoints */}
      <circle cx="12" cy="3" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="17.5" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="4" cy="17.5" r="1.5" fill="currentColor" opacity="0.6" />
      {/* decision diamond on hub */}
      <polyline
        points="12,8 14.5,10 12,12 9.5,10 12,8"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

const GLYPH_MAP: Record<TopologyType, (props: GlyphProps) => React.ReactElement> = {
  orchestrator_worker: HubAndSpokeGlyph,
  supervisor: HierarchicalGlyph,
  swarm: PeerGlyph,
  pipeline: PipelineGlyph,
  router: RouterGlyph,
  solo_plus_tools: SoloPlusToolsGlyph,
  other: OtherGlyph,
};

export const TOPOLOGY_LABELS: Record<TopologyType, string> = {
  orchestrator_worker: 'Orchestrator–Worker',
  supervisor: 'Supervisor',
  swarm: 'Swarm',
  pipeline: 'Pipeline',
  router: 'Router',
  solo_plus_tools: 'Solo + Tools',
  other: 'Other',
};

interface TopologyGlyphProps {
  topology: TopologyType;
  size?: number;
  className?: string;
  /** Show the label next to the glyph */
  showLabel?: boolean;
  labelClassName?: string;
}

export default function TopologyGlyph({
  topology,
  size = 24,
  className = '',
  showLabel = false,
  labelClassName = '',
}: TopologyGlyphProps) {
  const GlyphComponent = GLYPH_MAP[topology];
  const label = TOPOLOGY_LABELS[topology];

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <GlyphComponent size={size} />
        <span className={labelClassName}>{label}</span>
      </span>
    );
  }

  return <GlyphComponent size={size} className={className} />;
}
