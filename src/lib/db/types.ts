// Row types mirror schema.ts exactly. SQLite has no booleans: `featured` and
// `illustrative` are 0/1 integers at the row level and converted at the edge.

export type Provenance = 'self_reported' | 'evidence_linked' | 'attested';
export type TrustTier = 'self_reported' | 'evidence_linked' | 'peer_attested' | 'platform_verified';
export type SubjectType = 'agent' | 'team';
export type ContactSubjectType = 'agent' | 'team' | 'owner';
export type ProofType = 'task' | 'incident' | 'lesson' | 'milestone' | 'artifact';
export type MetricUnit = 'pct' | 'count' | 'ms' | 'usd' | 'days';
export type SubjectStatus = 'active' | 'paused' | 'retired';
export type LineageKind = 'original' | 'fork' | 'instance';
export type TeamKind = 'team' | 'swarm';

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
  illustrative: number;
  created_at: string;
}

export interface TeamRow {
  id: number;
  slug: string;
  name: string;
  avatar: string;
  kind: TeamKind;
  tagline: string;
  about: string | null;
  topology: string | null;
  oversight: string | null;
  how_built: string | null;
  owner_id: number;
  status: SubjectStatus;
  operational_since: string | null;
  featured: number;
  illustrative: number;
  created_at: string;
}

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
  value: number;
  unit: MetricUnit;
  provenance: Provenance;
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
  created_at: string;
}

export interface TeamMemberRow {
  team_id: number;
  agent_id: number;
  role: string;
  role_detail: string | null;
  ordinal: number;
}

// ---- composed shapes the UI consumes ----

export interface AgentCardData {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  category: string;
  platform: string;
  status: SubjectStatus;
  ownerHandle: string;
  ownerName: string;
  tier: TrustTier;
  proofCount: number;
  illustrative: boolean;
  metrics: MetricRow[]; // up to 3, for the card footer
}

export interface TeamMemberData {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  role: string;
  roleDetail: string | null;
  ordinal: number;
}

export interface TeamCardData {
  slug: string;
  name: string;
  avatar: string;
  kind: TeamKind;
  tagline: string;
  ownerHandle: string;
  ownerName: string;
  tier: TrustTier;
  proofCount: number;
  illustrative: boolean;
  members: Pick<TeamMemberData, 'slug' | 'name' | 'avatar' | 'role'>[];
  metrics: MetricRow[];
}

export interface AgentProfile {
  agent: AgentRow;
  owner: OwnerRow;
  tier: TrustTier;
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  capabilities: CapabilityRow[];
  attestations: AttestationRow[];
  teams: { slug: string; name: string; avatar: string; kind: TeamKind; role: string }[];
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

export interface OwnerProfile {
  owner: OwnerRow;
  agents: AgentCardData[];
  teams: TeamCardData[];
}

export interface SiteCounts {
  agents: number;
  teams: number;
  owners: number;
  proofEntries: number;
}
