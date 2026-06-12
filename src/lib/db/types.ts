// Row types mirror schema.ts exactly. SQLite has no booleans: `featured` is a
// 0/1 integer at the row level and converted at the edge.
// v4.1: `teams` is the primary entity; `configurations` kept as deprecated aliases.
// proof_entries/metrics/attestations keep their per-claim `illustrative` flag.

export type Provenance = 'self_reported' | 'evidence_linked' | 'attested';
export type TrustTier = 'self_reported' | 'evidence_linked' | 'peer_attested' | 'platform_verified';
export type SubjectType = 'agent' | 'team';
export type ContactSubjectType = 'agent' | 'team' | 'owner';
export type ProofType = 'task' | 'incident' | 'lesson' | 'milestone' | 'artifact';
export type MetricUnit = 'pct' | 'count' | 'ms' | 'usd' | 'days';
export type SubjectStatus = 'active' | 'paused' | 'retired';
export type LineageKind = 'original' | 'fork' | 'instance';
export type ConfigKind = 'team' | 'swarm';
export type SeedLayer = 'real' | 'curated' | 'illustrative';
export type TopologyType =
  | 'supervisor'
  | 'orchestrator_worker'
  | 'swarm'
  | 'pipeline'
  | 'router'
  | 'solo_plus_tools'
  | 'other';
export type ContactKind = 'request_setup' | 'claim' | 'general';

export interface UserRow {
  id: number;
  email: string | null;
  name: string;
  image: string | null;
  provider: string;
  handle: string | null;
  created_at: string;
}

export interface OwnerRow {
  id: number;
  handle: string;
  display_name: string;
  kind: 'individual' | 'org';
  bio: string | null;
  website_url: string | null;
  /** Set when a signed-in user has registered or claimed this owner profile. */
  user_id: number | null;
  created_at: string;
}

export interface AgentRow {
  id: number;
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  about: string | null;
  category: string;
  platform: string;
  model: string | null;
  owner_id: number;
  lineage_kind: LineageKind;
  lineage_of: number | null;
  lineage_note: string | null;
  oversight: string | null;
  how_built: string | null;
  status: SubjectStatus;
  operational_since: string | null;
  featured: number;
  seed_layer: SeedLayer;
  source_url: string | null;
  source_name: string | null;
  created_at: string;
}

export interface TeamRow {
  id: number;
  slug: string;
  name: string;
  avatar: string;
  kind: ConfigKind;
  tagline: string;
  about: string | null;
  topology: string | null;
  oversight: string | null;
  how_built: string | null;
  owner_id: number;
  status: SubjectStatus;
  operational_since: string | null;
  featured: number;
  topology_type: TopologyType | null;
  agent_count: number | null;
  platform: string | null;
  industries: string | null;
  task_kinds: string | null;
  why_it_works: string | null;
  seed_layer: SeedLayer;
  source_url: string | null;
  source_name: string | null;
  created_at: string;
}

// Deprecated alias — kept for any code not yet migrated.
export type ConfigurationRow = TeamRow;

export interface ProofEntryRow {
  id: number;
  subject_type: SubjectType;
  subject_id: number;
  entry_date: string;
  type: ProofType;
  title: string;
  body: string | null;
  evidence_url: string | null;
  provenance: Provenance;
  illustrative: number;
  created_at: string;
}

export interface MetricRow {
  id: number;
  subject_type: SubjectType;
  subject_id: number;
  key: string;
  label: string;
  /** null = honestly unknown — rendered as "[unknown]", never invented. */
  value: number | null;
  unit: MetricUnit;
  provenance: Provenance;
  /** Precise provenance annotation, e.g. "[derived-from-registry, window-scoped]". */
  note: string | null;
  illustrative: number;
  as_of: string;
}

export interface CapabilityRow {
  id: number;
  agent_id: number;
  name: string;
  level: number;
}

export interface AttestationRow {
  id: number;
  subject_type: SubjectType;
  subject_id: number;
  author_name: string;
  author_url: string | null;
  relationship: string;
  statement: string;
  illustrative: number;
  created_at: string;
}

export interface ContactRequestRow {
  id: number;
  subject_type: ContactSubjectType;
  subject_id: number;
  requester_name: string;
  requester_email: string;
  message: string;
  status: 'pending' | 'contacted' | 'closed';
  kind: ContactKind;
  created_at: string;
}

export interface TeamMemberRow {
  team_id: number;
  agent_id: number;
  role: string;
  role_detail: string | null;
  ordinal: number;
}

// Deprecated alias — kept for any code not yet migrated.
export type ConfigurationMemberRow = TeamMemberRow;

// ---- composed shapes the UI consumes ----

export interface AgentCardData {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  category: string;
  platform: string;
  model: string | null;
  status: SubjectStatus;
  ownerHandle: string;
  ownerName: string;
  tier: TrustTier;
  proofCount: number;
  /** Number of proof entries that carry a public evidence URL. */
  evidenceCount: number;
  configurationCount: number;
  seedLayer: SeedLayer;
  metrics: MetricRow[]; // up to 3, for the card footer
  /** Headline metric surfaced from a parent team when agent has no own metrics. */
  viaConfigMetric?: (MetricRow & { configName: string; configSlug: string }) | null;
}

export interface TeamMemberData {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  role: string;
  roleDetail: string | null;
  ordinal: number;
  model: string | null;
}

// Deprecated alias — kept for any code not yet migrated.
export type ConfigurationMemberData = TeamMemberData;

export interface TeamCardData {
  slug: string;
  name: string;
  avatar: string;
  kind: ConfigKind;
  tagline: string;
  ownerHandle: string;
  ownerName: string;
  tier: TrustTier;
  proofCount: number;
  seedLayer: SeedLayer;
  topologyType: TopologyType | null;
  agentCount: number | null;
  platform: string | null;
  industries: string[];
  members: Pick<TeamMemberData, 'slug' | 'name' | 'avatar' | 'role' | 'model'>[];
  metrics: MetricRow[];
}

// Deprecated alias — kept for any code not yet migrated.
export type ConfigurationCardData = TeamCardData;

export interface AgentProfile {
  agent: AgentRow;
  owner: OwnerRow;
  tier: TrustTier;
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  capabilities: CapabilityRow[];
  attestations: AttestationRow[];
  configurations: {
    slug: string;
    name: string;
    avatar: string;
    kind: ConfigKind;
    role: string;
  }[];
  lineageParent: { slug: string; name: string } | null;
  lineageChildren: { slug: string; name: string; lineage_kind: LineageKind }[];
}

export interface TeamProfile {
  team: TeamRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: TeamMemberData[];
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  attestations: AttestationRow[];
}

// Deprecated alias — kept for any code not yet migrated.
// Note: ConfigurationProfile.configuration field maps to TeamProfile.team.
export interface ConfigurationProfile {
  configuration: TeamRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: TeamMemberData[];
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  attestations: AttestationRow[];
}

export interface OwnerProofFeedEntry extends ProofEntryRow {
  subjectName: string;
  subjectSlug: string;
  subjectKind: SubjectType;
}

export interface OwnerProfile {
  owner: OwnerRow;
  agents: AgentCardData[];
  teams: TeamCardData[];
  proofFeed: OwnerProofFeedEntry[];
}

export interface SiteCounts {
  agents: number;
  teams: number;
  owners: number;
  proofEntries: number;
}

// ---- v6: operational files ------------------------------------------------

export type FileVisibility = 'private' | 'public';
export type SanitizationState = 'needs_scan' | 'scan_complete' | 'scan_error';
export type FindingType = 'secret' | 'pii' | 'confidential';
export type FindingSeverity = 'critical' | 'blocking' | 'advisory';
export type FindingStatus = 'unresolved' | 'masked' | 'dismissed' | 'stale';
export type ScanTrigger = 'content_change' | 'manual_rescan' | 'visibility_attempt' | 'seed_review';

export interface FileRow {
  id: number;
  subject_type: SubjectType;
  subject_id: number;
  path: string;
  content_private: string;
  content_public: string | null;
  visibility: FileVisibility;
  sanitization_state: SanitizationState;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FileScanLogRow {
  id: number;
  file_id: number;
  scan_ts: string;
  detector_versions: string;
  finding_count: number;
  error_message: string | null;
  triggered_by: ScanTrigger;
}

export interface FileListItem {
  id: number;
  path: string;
  visibility: FileVisibility;
  sanitization_state: SanitizationState;
  updated_at: string;
  last_scan_ts: string | null;
}
