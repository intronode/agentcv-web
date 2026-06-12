import { getDb } from './index';
import type {
  AgentCardData,
  AgentProfile,
  AgentRow,
  AttestationRow,
  CapabilityRow,
  ConfigKind,
  TeamCardData,
  TeamMemberData,
  TeamProfile,
  TeamRow,
  ContactSubjectType,
  MetricRow,
  OwnerProfile,
  OwnerProofFeedEntry,
  OwnerRow,
  ProofEntryRow,
  ProofType,
  SiteCounts,
  SubjectType,
  TrustTier,
} from './types';

// Deprecated type aliases — kept so old import sites keep compiling.
export type ConfigurationCardData = TeamCardData;
export type ConfigurationProfile = {
  configuration: TeamRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: TeamMemberData[];
  metrics: MetricRow[];
  proof: ProofEntryRow[];
  attestations: AttestationRow[];
};
export type ConfigurationMemberData = TeamMemberData;
export type ConfigurationRow = TeamRow;
export type TeamKind = ConfigKind;

// ---- trust tier -----------------------------------------------------------

export const EVIDENCE_THRESHOLD = 3;

/**
 * Tier is computed from evidence on record, never self-assigned.
 * `platform_verified` is designed but not grantable — nothing computes to it.
 */
export function computeTier(evidenceCount: number, attestationCount: number): TrustTier {
  if (evidenceCount >= EVIDENCE_THRESHOLD && attestationCount >= 1) return 'peer_attested';
  if (evidenceCount >= EVIDENCE_THRESHOLD) return 'evidence_linked';
  return 'self_reported';
}

interface SubjectCounts {
  proof_count: number;
  evidence_count: number;
  attestation_count: number;
}

const COUNT_SELECTS = (subjectType: SubjectType, alias: string): string => `
  (SELECT COUNT(*) FROM proof_entries p WHERE p.subject_type='${subjectType}' AND p.subject_id=${alias}.id) AS proof_count,
  (SELECT COUNT(*) FROM proof_entries p WHERE p.subject_type='${subjectType}' AND p.subject_id=${alias}.id AND p.evidence_url IS NOT NULL) AS evidence_count,
  (SELECT COUNT(*) FROM attestations t WHERE t.subject_type='${subjectType}' AND t.subject_id=${alias}.id) AS attestation_count`;

// ---- list: agents ---------------------------------------------------------

export interface AgentListFilters {
  q?: string;
  category?: string;
  platform?: string;
  tier?: TrustTier;
  sort?: 'proof' | 'newest' | 'name';
  ownerId?: number;
  limit?: number;
}

const CARD_METRIC_KEYS = [
  'window_reconciliation_pct',
  'uptime_pct',
  'tasks_completed',
  'success_rate',
];

function cardMetricsFor(subjectType: SubjectType, ids: number[]): Map<number, MetricRow[]> {
  const map = new Map<number, MetricRow[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const keyPlaceholders = CARD_METRIC_KEYS.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT * FROM metrics WHERE subject_type=? AND subject_id IN (${placeholders}) AND key IN (${keyPlaceholders})
       ORDER BY CASE WHEN value IS NULL THEN 1 ELSE 0 END, CASE key WHEN 'window_reconciliation_pct' THEN 0 WHEN 'uptime_pct' THEN 1 WHEN 'tasks_completed' THEN 2 ELSE 3 END`
    )
    .all(subjectType, ...ids, ...CARD_METRIC_KEYS) as MetricRow[];
  for (const row of rows) {
    const list = map.get(row.subject_id) ?? [];
    list.push(row);
    map.set(row.subject_id, list);
  }
  return map;
}

type AgentListRow = AgentRow &
  SubjectCounts & { owner_handle: string; owner_name: string; config_count: number };

export function listAgents(filters: AgentListFilters = {}): AgentCardData[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.q) {
    where.push('(a.name LIKE ? OR a.tagline LIKE ? OR a.category LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.category) {
    where.push('a.category = ?');
    params.push(filters.category);
  }
  if (filters.platform) {
    where.push('a.platform = ?');
    params.push(filters.platform);
  }
  if (filters.ownerId !== undefined) {
    where.push('a.owner_id = ?');
    params.push(filters.ownerId);
  }
  const orderBy =
    filters.sort === 'newest'
      ? 'a.operational_since IS NULL, a.operational_since DESC'
      : filters.sort === 'name'
        ? 'a.name COLLATE NOCASE ASC'
        : 'proof_count DESC, a.name COLLATE NOCASE ASC';

  const rows = getDb()
    .prepare(
      `SELECT a.*, o.handle AS owner_handle, o.display_name AS owner_name,
              ${COUNT_SELECTS('agent', 'a')},
              (SELECT COUNT(*) FROM team_members cm WHERE cm.agent_id = a.id) AS config_count
       FROM agents a JOIN owners o ON o.id = a.owner_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${orderBy}
       LIMIT ?`
    )
    .all(...params, filters.limit ?? 100) as AgentListRow[];

  const metrics = cardMetricsFor(
    'agent',
    rows.map((r) => r.id)
  );

  // For agents with no own card metrics, surface a headline metric from one of
  // their parent teams (batched — not N+1).  We collect the team slugs
  // for metric-less agents in a single pass, call getTeamHeadlineMetrics
  // once, then stitch the result back by agent slug.
  const agentSlugToConfigSlug = new Map<string, string>();
  const configSlugsNeeded = new Set<string>();
  for (const r of rows) {
    if ((metrics.get(r.id) ?? []).length === 0 && r.config_count > 0) {
      const firstConfig = getDb()
        .prepare(
          `SELECT c.slug FROM teams c
           JOIN team_members cm ON cm.team_id = c.id
           JOIN agents a ON a.id = cm.agent_id
           WHERE a.id = ?
           ORDER BY c.featured DESC, c.id ASC
           LIMIT 1`
        )
        .get(r.id) as { slug: string } | undefined;
      if (firstConfig) {
        agentSlugToConfigSlug.set(r.slug, firstConfig.slug);
        configSlugsNeeded.add(firstConfig.slug);
      }
    }
  }
  const configHeadlines = getTeamHeadlineMetrics([...configSlugsNeeded]);

  const cards = rows.map((r): AgentCardData => {
    const ownMetrics = metrics.get(r.id) ?? [];
    let viaConfigMetric: AgentCardData['viaConfigMetric'] = null;
    if (ownMetrics.length === 0) {
      const configSlug = agentSlugToConfigSlug.get(r.slug);
      if (configSlug) {
        const headline = configHeadlines.get(configSlug);
        if (headline) {
          viaConfigMetric = { ...headline, configSlug };
        }
      }
    }
    return {
      slug: r.slug,
      name: r.name,
      avatar: r.avatar,
      tagline: r.tagline,
      category: r.category,
      platform: r.platform,
      model: r.model,
      status: r.status,
      ownerHandle: r.owner_handle,
      ownerName: r.owner_name,
      tier: computeTier(r.evidence_count, r.attestation_count),
      proofCount: r.proof_count,
      evidenceCount: r.evidence_count,
      configurationCount: r.config_count,
      seedLayer: r.seed_layer,
      metrics: ownMetrics,
      viaConfigMetric,
    };
  });
  return filters.tier ? cards.filter((c) => c.tier === filters.tier) : cards;
}

export function agentFilterOptions(): { categories: string[]; platforms: string[] } {
  const db = getDb();
  const categories = (
    db.prepare('SELECT DISTINCT category FROM agents ORDER BY category').all() as {
      category: string;
    }[]
  ).map((r) => r.category);
  const platforms = (
    db.prepare('SELECT DISTINCT platform FROM agents ORDER BY platform').all() as {
      platform: string;
    }[]
  ).map((r) => r.platform);
  return { categories, platforms };
}

// ---- list: teams (v4.1: first-class entity) ---------------------------------

export interface TeamListFilters {
  q?: string;
  topology_type?: string;
  platform?: string;
  industry?: string;
  tier?: TrustTier;
  seed_layer?: string;
  agent_count_band?: '1-2' | '3-5' | '6+';
  sort?: 'recency' | 'tier' | 'agent_count';
  ownerId?: number;
}

// Deprecated alias — kept for call-sites not yet migrated.
export type ConfigurationListFilters = TeamListFilters;

type TeamListRow = TeamRow & SubjectCounts & { owner_handle: string; owner_name: string };

export function listTeams(ownerIdOrFilters?: number | TeamListFilters): TeamCardData[] {
  const ownerId =
    typeof ownerIdOrFilters === 'number' ? ownerIdOrFilters : ownerIdOrFilters?.ownerId;
  const filters: TeamListFilters = typeof ownerIdOrFilters === 'object' ? ownerIdOrFilters : {};

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (ownerId !== undefined) {
    where.push('c.owner_id = ?');
    params.push(ownerId);
  }
  if (filters.q) {
    where.push('(c.name LIKE ? OR c.tagline LIKE ? OR c.about LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.topology_type) {
    where.push('c.topology_type = ?');
    params.push(filters.topology_type);
  }
  if (filters.platform) {
    where.push('c.platform = ?');
    params.push(filters.platform);
  }
  if (filters.industry) {
    where.push('c.industries LIKE ?');
    params.push(`%${filters.industry}%`);
  }
  if (filters.seed_layer) {
    where.push('c.seed_layer = ?');
    params.push(filters.seed_layer);
  }
  if (filters.agent_count_band) {
    if (filters.agent_count_band === '1-2') {
      where.push('c.agent_count BETWEEN 1 AND 2');
    } else if (filters.agent_count_band === '3-5') {
      where.push('c.agent_count BETWEEN 3 AND 5');
    } else if (filters.agent_count_band === '6+') {
      where.push('c.agent_count >= 6');
    }
  }

  const orderBy =
    filters.sort === 'recency'
      ? 'c.operational_since IS NULL, c.operational_since DESC'
      : filters.sort === 'agent_count'
        ? 'c.agent_count DESC NULLS LAST'
        : filters.sort === 'tier'
          ? 'evidence_count DESC, attestation_count DESC'
          : 'c.featured DESC, proof_count DESC, c.name COLLATE NOCASE ASC';

  const rows = getDb()
    .prepare(
      `SELECT c.*, o.handle AS owner_handle, o.display_name AS owner_name, ${COUNT_SELECTS('team', 'c')}
       FROM teams c JOIN owners o ON o.id = c.owner_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY ${orderBy}
       LIMIT 100`
    )
    .all(...params) as TeamListRow[];

  const metrics = cardMetricsFor(
    'team',
    rows.map((r) => r.id)
  );
  const memberStmt = getDb().prepare(
    `SELECT a.slug, a.name, a.avatar, a.model, m.role FROM team_members m
     JOIN agents a ON a.id = m.agent_id WHERE m.team_id = ? ORDER BY m.ordinal`
  );
  const cards = rows.map(
    (r): TeamCardData => ({
      slug: r.slug,
      name: r.name,
      avatar: r.avatar,
      kind: r.kind,
      tagline: r.tagline,
      ownerHandle: r.owner_handle,
      ownerName: r.owner_name,
      tier: computeTier(r.evidence_count, r.attestation_count),
      proofCount: r.proof_count,
      seedLayer: r.seed_layer,
      topologyType: r.topology_type,
      agentCount: r.agent_count,
      platform: r.platform,
      industries: r.industries ? (JSON.parse(r.industries) as string[]) : [],
      members: memberStmt.all(r.id) as TeamCardData['members'],
      metrics: metrics.get(r.id) ?? [],
    })
  );
  return filters.tier ? cards.filter((c) => c.tier === filters.tier) : cards;
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export const listConfigurations = listTeams;

export function teamFilterOptions(): { platforms: string[]; topologyTypes: string[] } {
  const db = getDb();
  const platforms = (
    db
      .prepare('SELECT DISTINCT platform FROM teams WHERE platform IS NOT NULL ORDER BY platform')
      .all() as { platform: string }[]
  ).map((r) => r.platform);
  const topologyTypes = (
    db
      .prepare(
        'SELECT DISTINCT topology_type FROM teams WHERE topology_type IS NOT NULL ORDER BY topology_type'
      )
      .all() as { topology_type: string }[]
  ).map((r) => r.topology_type);
  return { platforms, topologyTypes };
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export const configurationFilterOptions = teamFilterOptions;

// ---- profiles -------------------------------------------------------------

function subjectExtras(subjectType: SubjectType, id: number) {
  const db = getDb();
  const metrics = db
    .prepare(
      'SELECT * FROM metrics WHERE subject_type=? AND subject_id=? ORDER BY CASE WHEN value IS NULL THEN 1 ELSE 0 END, id'
    )
    .all(subjectType, id) as MetricRow[];
  const proof = db
    .prepare(
      'SELECT * FROM proof_entries WHERE subject_type=? AND subject_id=? ORDER BY entry_date DESC, id DESC'
    )
    .all(subjectType, id) as ProofEntryRow[];
  const attestations = db
    .prepare('SELECT * FROM attestations WHERE subject_type=? AND subject_id=? ORDER BY id')
    .all(subjectType, id) as AttestationRow[];
  const evidenceCount = proof.filter((p) => p.evidence_url !== null).length;
  return { metrics, proof, attestations, tier: computeTier(evidenceCount, attestations.length) };
}

export function getAgentProfile(slug: string): AgentProfile | null {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE slug=?').get(slug) as AgentRow | undefined;
  if (!agent) return null;
  const owner = db.prepare('SELECT * FROM owners WHERE id=?').get(agent.owner_id) as OwnerRow;
  const { metrics, proof, attestations, tier } = subjectExtras('agent', agent.id);
  const capabilities = db
    .prepare('SELECT * FROM capabilities WHERE agent_id=? ORDER BY level DESC')
    .all(agent.id) as CapabilityRow[];
  const configurations = db
    .prepare(
      `SELECT c.slug, c.name, c.avatar, c.kind, m.role FROM team_members m
       JOIN teams c ON c.id = m.team_id WHERE m.agent_id=? ORDER BY c.name`
    )
    .all(agent.id) as AgentProfile['configurations'];
  const lineageParent = agent.lineage_of
    ? ((db.prepare('SELECT slug, name FROM agents WHERE id=?').get(agent.lineage_of) as
        | { slug: string; name: string }
        | undefined) ?? null)
    : null;
  const lineageChildren = db
    .prepare('SELECT slug, name, lineage_kind FROM agents WHERE lineage_of=? ORDER BY name')
    .all(agent.id) as AgentProfile['lineageChildren'];
  return {
    agent,
    owner,
    tier,
    metrics,
    proof,
    capabilities,
    attestations,
    configurations,
    lineageParent,
    lineageChildren,
  };
}

export function getTeamProfile(slug: string): TeamProfile | null {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE slug=?').get(slug) as TeamRow | undefined;
  if (!team) return null;
  const owner = db.prepare('SELECT * FROM owners WHERE id=?').get(team.owner_id) as OwnerRow;
  const { metrics, proof, attestations, tier } = subjectExtras('team', team.id);
  const members = db
    .prepare(
      `SELECT a.slug, a.name, a.avatar, a.tagline, a.model, m.role, m.role_detail AS roleDetail, m.ordinal
       FROM team_members m JOIN agents a ON a.id = m.agent_id
       WHERE m.team_id=? ORDER BY m.ordinal`
    )
    .all(team.id) as TeamMemberData[];
  return { team, owner, tier, members, metrics, proof, attestations };
}

/**
 * Deprecated alias — returns shape with .configuration field for backward compat.
 * New code should use getTeamProfile().
 */
export function getConfigurationProfile(slug: string): ConfigurationProfile | null {
  const profile = getTeamProfile(slug);
  if (!profile) return null;
  return {
    configuration: profile.team,
    owner: profile.owner,
    tier: profile.tier,
    members: profile.members,
    metrics: profile.metrics,
    proof: profile.proof,
    attestations: profile.attestations,
  };
}

/**
 * Fetch the single best (non-null value preferred) headline metric for each
 * of the given team slugs.  Used by the agent-profile page to surface
 * team-level metrics when the agent itself has none.
 */
export function getTeamHeadlineMetrics(
  slugs: string[]
): Map<string, MetricRow & { configName: string }> {
  const result = new Map<string, MetricRow & { configName: string }>();
  if (slugs.length === 0) return result;
  const db = getDb();
  for (const slug of slugs) {
    const team = db.prepare('SELECT id, name FROM teams WHERE slug=?').get(slug) as
      | { id: number; name: string }
      | undefined;
    if (!team) continue;
    // Query ALL metrics for this team — do NOT restrict to CARD_METRIC_KEYS.
    // The CARD_METRIC_KEYS filter was designed for the team card grid and only
    // included Ari-specific keys, silently producing no headline for curated teams
    // (e.g. magentic-one uses gaia_score, webarena_score).  Here we want the first
    // non-null metric regardless of key; non-null rows are ranked first.
    const metric = db
      .prepare(
        `SELECT * FROM metrics
         WHERE subject_type='team' AND subject_id=?
         ORDER BY CASE WHEN value IS NULL THEN 1 ELSE 0 END, id ASC
         LIMIT 1`
      )
      .get(team.id) as MetricRow | undefined;
    if (metric) {
      result.set(slug, { ...metric, configName: team.name });
    }
  }
  return result;
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export const getConfigurationHeadlineMetrics = getTeamHeadlineMetrics;

/**
 * Fetch the computed trust tier for each of the given team slugs.
 * Used by the agent-detail page to compare agent tier vs. team tier.
 */
export function getTeamTiers(slugs: string[]): Map<string, TrustTier> {
  const result = new Map<string, TrustTier>();
  if (slugs.length === 0) return result;
  const db = getDb();
  for (const slug of slugs) {
    const team = db.prepare('SELECT id FROM teams WHERE slug=?').get(slug) as
      | { id: number }
      | undefined;
    if (!team) continue;
    const evidenceCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM proof_entries WHERE subject_type='team' AND subject_id=? AND evidence_url IS NOT NULL`
        )
        .get(team.id) as { cnt: number }
    ).cnt;
    const attestationCount = (
      db
        .prepare(
          `SELECT COUNT(*) AS cnt FROM attestations WHERE subject_type='team' AND subject_id=?`
        )
        .get(team.id) as { cnt: number }
    ).cnt;
    result.set(slug, computeTier(evidenceCount, attestationCount));
  }
  return result;
}

export function getOwnerProfile(handle: string): OwnerProfile | null {
  const db = getDb();
  const owner = db.prepare('SELECT * FROM owners WHERE handle=?').get(handle) as
    | OwnerRow
    | undefined;
  if (!owner) return null;

  const agents = listAgents({ ownerId: owner.id });
  const teams = listTeams(owner.id);

  // Build proof feed: aggregate proof entries across all subjects owned by this owner.
  // Each entry is annotated with the subject name + slug so the feed can link back.
  const agentRows = db
    .prepare('SELECT id, slug, name FROM agents WHERE owner_id=?')
    .all(owner.id) as { id: number; slug: string; name: string }[];
  const teamRows = db
    .prepare('SELECT id, slug, name FROM teams WHERE owner_id=?')
    .all(owner.id) as { id: number; slug: string; name: string }[];

  const proofFeed: OwnerProofFeedEntry[] = [];

  for (const a of agentRows) {
    const rows = db
      .prepare(
        `SELECT * FROM proof_entries WHERE subject_type='agent' AND subject_id=? ORDER BY entry_date DESC, id DESC LIMIT 10`
      )
      .all(a.id) as ProofEntryRow[];
    for (const r of rows)
      proofFeed.push({ ...r, subjectName: a.name, subjectSlug: a.slug, subjectKind: 'agent' });
  }
  for (const c of teamRows) {
    const rows = db
      .prepare(
        `SELECT * FROM proof_entries WHERE subject_type='team' AND subject_id=? ORDER BY entry_date DESC, id DESC LIMIT 10`
      )
      .all(c.id) as ProofEntryRow[];
    for (const r of rows)
      proofFeed.push({
        ...r,
        subjectName: c.name,
        subjectSlug: c.slug,
        subjectKind: 'team',
      });
  }

  // Sort all entries newest-first, cap at 20 for the page feed
  proofFeed.sort((a, b) => {
    const dateCmp = b.entry_date.localeCompare(a.entry_date);
    return dateCmp !== 0 ? dateCmp : b.id - a.id;
  });
  const cappedFeed = proofFeed.slice(0, 20);

  return { owner, agents, teams, proofFeed: cappedFeed };
}

// ---- compare --------------------------------------------------------------

export interface TeamCompareData {
  team: TeamRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: TeamMemberData[];
  metrics: MetricRow[];
  proofCount: number;
  evidenceCount: number;
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export interface ConfigurationCompareData {
  configuration: TeamRow;
  owner: OwnerRow;
  tier: TrustTier;
  members: TeamMemberData[];
  metrics: MetricRow[];
  proofCount: number;
  evidenceCount: number;
}

/**
 * Fetch 2–3 teams by slug for the /compare page.
 * Returns only found slugs (invalid slugs are silently dropped).
 * Order preserves the input slug order.
 */
export function getTeamsForCompare(slugs: string[]): ConfigurationCompareData[] {
  const db = getDb();
  const results: ConfigurationCompareData[] = [];
  const memberStmt = db.prepare(
    `SELECT a.slug, a.name, a.avatar, a.tagline, a.model, m.role, m.role_detail AS roleDetail, m.ordinal
     FROM team_members m JOIN agents a ON a.id = m.agent_id
     WHERE m.team_id=? ORDER BY m.ordinal`
  );
  for (const slug of slugs) {
    const team = db.prepare('SELECT * FROM teams WHERE slug=?').get(slug) as TeamRow | undefined;
    if (!team) continue;
    const owner = db.prepare('SELECT * FROM owners WHERE id=?').get(team.owner_id) as OwnerRow;
    const { metrics, proof, attestations, tier } = subjectExtras('team', team.id);
    const evidenceCount = proof.filter((p) => p.evidence_url !== null).length;
    const members = memberStmt.all(team.id) as TeamMemberData[];
    results.push({
      configuration: team,
      owner,
      tier,
      members,
      metrics,
      proofCount: proof.length,
      evidenceCount,
    });
  }
  return results;
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export const getConfigurationsForCompare = getTeamsForCompare;

// ---- landing --------------------------------------------------------------

export function getCounts(): SiteCounts {
  const db = getDb();
  const one = (sql: string): number => (db.prepare(sql).get() as { n: number }).n;
  return {
    agents: one('SELECT COUNT(*) AS n FROM agents'),
    teams: one('SELECT COUNT(*) AS n FROM teams'),
    owners: one('SELECT COUNT(*) AS n FROM owners'),
    proofEntries: one('SELECT COUNT(*) AS n FROM proof_entries'),
  };
}

export interface LayerCounts {
  real: number;
  curated: number;
  illustrative: number;
  evidenceLinked: number;
}

/** Counts across both teams + agents per seed layer, plus evidence-linked proof. */
export function getLayerCounts(): LayerCounts {
  const db = getDb();
  const one = (sql: string, ...params: (string | number)[]): number =>
    (db.prepare(sql).get(...params) as { n: number }).n;
  return {
    real:
      one("SELECT COUNT(*) AS n FROM teams WHERE seed_layer='real'") +
      one("SELECT COUNT(*) AS n FROM agents WHERE seed_layer='real'"),
    curated:
      one("SELECT COUNT(*) AS n FROM teams WHERE seed_layer='curated'") +
      one("SELECT COUNT(*) AS n FROM agents WHERE seed_layer='curated'"),
    illustrative:
      one("SELECT COUNT(*) AS n FROM teams WHERE seed_layer='illustrative'") +
      one("SELECT COUNT(*) AS n FROM agents WHERE seed_layer='illustrative'"),
    evidenceLinked: one('SELECT COUNT(*) AS n FROM proof_entries WHERE evidence_url IS NOT NULL'),
  };
}

export function getFeatured(): {
  agents: AgentCardData[];
  teams: TeamCardData[];
  /** @deprecated use teams */
  configurations: TeamCardData[];
} {
  const slugsOf = (sql: string): Set<string> =>
    new Set((getDb().prepare(sql).all() as { slug: string }[]).map((r) => r.slug));
  const featuredAgents = slugsOf('SELECT slug FROM agents WHERE featured=1');
  const featuredTeams = slugsOf('SELECT slug FROM teams WHERE featured=1');

  // Ensure flagship Ari Collective is first; then fill to at least 3 from all teams.
  const allTeams = listTeams();
  const flagship = allTeams.find((c) => c.slug === 'ari-collective');
  const otherFeatured = allTeams.filter(
    (c) => featuredTeams.has(c.slug) && c.slug !== 'ari-collective'
  );
  const remainder = allTeams.filter(
    (c) => !featuredTeams.has(c.slug) && c.slug !== 'ari-collective'
  );
  const teams = [...(flagship ? [flagship] : []), ...otherFeatured, ...remainder].slice(0, 3);

  return {
    agents: listAgents({ limit: 100 })
      .filter((a) => featuredAgents.has(a.slug))
      .slice(0, 6),
    teams,
    configurations: teams, // backward-compat alias
  };
}

// ---- owners strip ---------------------------------------------------------

export interface OwnerStripEntry {
  handle: string;
  displayName: string;
  configCount: number;
  /** Comma-separated distinct seed_layer values, e.g. "real,curated" */
  layerMix: string;
}

/**
 * Compact owner list for the "Owners on the registry" strip shown on every
 * owner profile page.  Returns all owners that have at least one team,
 * ordered by team count descending, then name.
 */
export function getOwnersStrip(): OwnerStripEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.handle, o.display_name,
              COUNT(c.id) AS config_count,
              GROUP_CONCAT(DISTINCT c.seed_layer) AS layer_mix
       FROM owners o
       JOIN teams c ON c.owner_id = o.id
       GROUP BY o.id
       ORDER BY config_count DESC, o.display_name COLLATE NOCASE ASC`
    )
    .all() as { handle: string; display_name: string; config_count: number; layer_mix: string }[];
  return rows.map((r) => ({
    handle: r.handle,
    displayName: r.display_name,
    configCount: r.config_count,
    layerMix: r.layer_mix ?? '',
  }));
}

// ---- writes ---------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function uniqueSlug(table: 'agents' | 'teams', base: string): string {
  const db = getDb();
  const stmt = db.prepare(`SELECT 1 FROM ${table} WHERE slug=?`);
  let slug = base || 'agent';
  let i = 2;
  while (stmt.get(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

export interface RegisterAgentInput {
  name: string;
  tagline: string;
  category: string;
  platform: string;
  model?: string;
  about?: string;
  howBuilt?: string;
  oversight?: string;
  operationalSince?: string;
  ownerName: string;
  ownerHandle: string;
}

export function registerAgent(input: RegisterAgentInput): { slug: string; id: number } {
  const db = getDb();
  const tx = db.transaction((): { slug: string; id: number } => {
    let owner = db.prepare('SELECT * FROM owners WHERE handle=?').get(input.ownerHandle) as
      | OwnerRow
      | undefined;
    if (!owner) {
      const res = db
        .prepare('INSERT INTO owners (handle, display_name) VALUES (?, ?)')
        .run(slugify(input.ownerHandle), input.ownerName);
      owner = db.prepare('SELECT * FROM owners WHERE id=?').get(res.lastInsertRowid) as OwnerRow;
    }
    const slug = uniqueSlug('agents', slugify(input.name));
    const res = db
      .prepare(
        `INSERT INTO agents (slug, name, tagline, category, platform, model, about, how_built, oversight, operational_since, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        slug,
        input.name,
        input.tagline,
        input.category,
        input.platform,
        input.model ?? null,
        input.about ?? null,
        input.howBuilt ?? null,
        input.oversight ?? null,
        input.operationalSince ?? null,
        owner.id
      );
    return { slug, id: Number(res.lastInsertRowid) };
  });
  return tx();
}

export interface AddProofInput {
  subjectType: SubjectType;
  subjectSlug: string;
  type: ProofType;
  title: string;
  body?: string;
  evidenceUrl?: string;
  entryDate: string;
}

export function addProofEntry(input: AddProofInput): { id: number; tier: TrustTier } {
  const db = getDb();
  const table = input.subjectType === 'agent' ? 'agents' : 'teams';
  const subject = db.prepare(`SELECT id FROM ${table} WHERE slug=?`).get(input.subjectSlug) as
    | { id: number }
    | undefined;
  if (!subject) throw new Error(`Unknown ${input.subjectType}: ${input.subjectSlug}`);
  const provenance = input.evidenceUrl ? 'evidence_linked' : 'self_reported';
  const res = db
    .prepare(
      `INSERT INTO proof_entries (subject_type, subject_id, entry_date, type, title, body, evidence_url, provenance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.subjectType,
      subject.id,
      input.entryDate,
      input.type,
      input.title,
      input.body ?? null,
      input.evidenceUrl ?? null,
      provenance
    );
  const { tier } = subjectExtras(input.subjectType, subject.id);
  return { id: Number(res.lastInsertRowid), tier };
}

export interface AddAttestationInput {
  subjectType: SubjectType;
  subjectSlug: string;
  authorName: string;
  authorUrl?: string;
  relationship: string;
  statement: string;
}

export function addAttestation(input: AddAttestationInput): { id: number; tier: TrustTier } {
  const db = getDb();
  const table = input.subjectType === 'agent' ? 'agents' : 'teams';
  const subject = db.prepare(`SELECT id FROM ${table} WHERE slug=?`).get(input.subjectSlug) as
    | { id: number }
    | undefined;
  if (!subject) throw new Error(`Unknown ${input.subjectType}: ${input.subjectSlug}`);
  const res = db
    .prepare(
      `INSERT INTO attestations (subject_type, subject_id, author_name, author_url, relationship, statement, illustrative)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
    .run(
      input.subjectType,
      subject.id,
      input.authorName,
      input.authorUrl ?? null,
      input.relationship,
      input.statement
    );
  const { tier } = subjectExtras(input.subjectType, subject.id);
  return { id: Number(res.lastInsertRowid), tier };
}

export interface ContactInput {
  subjectType?: ContactSubjectType;
  subjectSlug?: string; // owner handle when subjectType === 'owner'
  requesterName: string;
  requesterEmail: string;
  message: string;
  kind?: string; // 'request_setup' | 'claim' | 'general'
}

export function createContactRequest(input: ContactInput): { id: number } {
  const db = getDb();
  const kind = input.kind ?? 'general';

  let subjectType: ContactSubjectType | null = null;
  let subjectId: number | null = null;

  if (input.subjectType && input.subjectSlug) {
    const table =
      input.subjectType === 'agent' ? 'agents' : input.subjectType === 'team' ? 'teams' : 'owners';
    const column = input.subjectType === 'owner' ? 'handle' : 'slug';
    const subject = db
      .prepare(`SELECT id FROM ${table} WHERE ${column}=?`)
      .get(input.subjectSlug) as { id: number } | undefined;
    if (!subject) throw new Error(`Unknown ${input.subjectType}: ${input.subjectSlug}`);
    subjectType = input.subjectType;
    subjectId = subject.id;
  }

  // For general requests with no subject, we allow null subject.
  // The schema CHECK requires subject_type to be in the enum — use a sentinel approach:
  // we store subjectType as 'owner' and subjectId as 0 for subjectless general requests.
  // For request_setup with no team ref, same sentinel.
  const storeType = subjectType ?? 'owner';
  const storeId = subjectId ?? 0;

  const res = db
    .prepare(
      `INSERT INTO contact_requests (subject_type, subject_id, requester_name, requester_email, message, kind)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(storeType, storeId, input.requesterName, input.requesterEmail, input.message, kind);
  return { id: Number(res.lastInsertRowid) };
}

// ---- register team -----------------------------------------------

export interface RegisterTeamInput {
  name: string;
  tagline: string;
  topologyType?: string;
  platform?: string;
  agentCount?: number;
  industries?: string[];
  taskKinds?: string[];
  topology?: string; // prose description
  whyItWorks?: string;
  howBuilt?: string;
  oversight?: string;
  operationalSince?: string;
  ownerName: string;
  ownerHandle: string;
  /** Existing agent slugs + roles for membership (agents must already exist). */
  members?: { agentSlug: string; role: string }[];
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export type RegisterConfigurationInput = RegisterTeamInput;

export function registerTeam(input: RegisterTeamInput): {
  slug: string;
  id: number;
} {
  const db = getDb();
  const tx = db.transaction((): { slug: string; id: number } => {
    // Find or create owner (same pattern as registerAgent).
    let owner = db.prepare('SELECT * FROM owners WHERE handle=?').get(input.ownerHandle) as
      | OwnerRow
      | undefined;
    if (!owner) {
      const res = db
        .prepare('INSERT INTO owners (handle, display_name) VALUES (?, ?)')
        .run(slugify(input.ownerHandle), input.ownerName);
      owner = db.prepare('SELECT * FROM owners WHERE id=?').get(res.lastInsertRowid) as OwnerRow;
    }

    const slug = uniqueSlug('teams', slugify(input.name));
    const res = db
      .prepare(
        `INSERT INTO teams
          (slug, name, tagline, topology_type, platform, agent_count,
           industries, task_kinds, topology, why_it_works, how_built, oversight,
           operational_since, owner_id, seed_layer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'real')`
      )
      .run(
        slug,
        input.name,
        input.tagline,
        input.topologyType ?? null,
        input.platform ?? null,
        input.agentCount ?? null,
        input.industries ? JSON.stringify(input.industries) : null,
        input.taskKinds ? JSON.stringify(input.taskKinds) : null,
        input.topology ?? null,
        input.whyItWorks ?? null,
        input.howBuilt ?? null,
        input.oversight ?? null,
        input.operationalSince ?? null,
        owner.id
      );
    const teamId = Number(res.lastInsertRowid);

    // Attach members if provided.
    if (input.members && input.members.length > 0) {
      const agentStmt = db.prepare('SELECT id FROM agents WHERE slug=?');
      const memberStmt = db.prepare(
        `INSERT INTO team_members (team_id, agent_id, role, ordinal)
         VALUES (?, ?, ?, ?)`
      );
      let ordinal = 0;
      for (const m of input.members) {
        const agent = agentStmt.get(m.agentSlug) as { id: number } | undefined;
        if (!agent) throw new Error(`Unknown agent: ${m.agentSlug}`);
        memberStmt.run(teamId, agent.id, m.role, ordinal++);
      }
    }

    return { slug, id: teamId };
  });
  return tx();
}

/** Deprecated alias — kept for call-sites not yet migrated. */
export const registerConfiguration = registerTeam;
