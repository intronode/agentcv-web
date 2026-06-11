// Row types mirror schema.ts exactly. SQLite has no booleans: `featured` is a
// 0/1 integer at the row level and converted at the edge.
// v4: `illustrative` on agents/configurations replaced by `seed_layer` enum.
// proof_entries/metrics/attestations keep their per-claim `illustrative` flag.

export type Provenance = 'self_reported' | 'evidence_linked' | 'attested';
export type TrustTier = 'self_reported' | 'evidence_linked' | 'peer_attested' | 'platform_verified';
export type SubjectType = 'agent' | 'configuration';
export type ContactSubjectType = 'agent' | 'configuration' | 'owner';
export type ProofType = 'task' | 'incident' | 'lesson' | 'milestone' | 'artifact';
export type MetricUnit = 'pct' | 'count' | 'ms' | 'usd' | 'days';
export type SubjectStatus = 'active' | 'paused' | 'retired';
export type LineageKind = 'original' | 'fork' | 'instance';
export type ConfigKind = 'team' | 'swarm';
export type SeedLayer = 'real' | 'curated' | 'illustrative';
export type TopologyType =
  | 'hub_and_spoke'
  | 'pipeline'
  | 'peer'
  | 'hierarchical'
  | 'solo_plus_tools'
  | 'other';
export type ContactKind = 'request_setup' | 'claim' | 'general';

export interface OwnerRow {
  id: number;
  handle: string;
  display_name: string;
  kind: 'individual' | 'org';
  bio: string | null;
  website_url: string | null;
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

export interface ConfigurationRow {
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

// Keep TeamRow as a type alias for backward compat with any internal usage,
// pointing to ConfigurationRow.
export type TeamRow = ConfigurationRow;

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

export interface ConfigurationMemberRow {
  configuration_id: number;
  agent_id: number;
  role: string;
  role_detail: string | null;
  ordinal: number;
}

// Keep TeamMemberRow as alias for ConfigurationMemberRow.
export type TeamMemberRow = ConfigurationMemberRow;

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
  configurationCount: number;
  seedLayer: SeedLayer;
  metrics: MetricRow[]; // up to 3, for the card footer
}

export interface ConfigurationMemberData {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  role: string;
  roleDetail: string | null;
  ordinal: number;
  model: string | null;
}

// Keep TeamMemberData as alias for UI code still using old name
export type TeamMemberData = ConfigurationMemberData;

export interface ConfigurationCardData {
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
  members: Pick<ConfigurationMemberData, 'slug' | 'name' | 'avatar' | 'role' | 'model'>[];
  metrics: MetricRow[];
}

// Keep TeamCardData as alias for UI code still using old name
export type TeamCardData = ConfigurationCardData;

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

export interface ConfigurationProfile {
  configuration: ConfigurationRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: ConfigurationMemberData[];
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  attestations: AttestationRow[];
}

// Keep TeamProfile as alias
export type TeamProfile = ConfigurationProfile;

export interface OwnerProfile {
  owner: OwnerRow;
  agents: AgentCardData[];
  configurations: ConfigurationCardData[];
}

export interface SiteCounts {
  agents: number;
  configurations: number;
  owners: number;
  proofEntries: number;
}
