import { getDb } from './index';
import type {
  AgentCardData,
  AgentProfile,
  AgentRow,
  AttestationRow,
  CapabilityRow,
  ContactSubjectType,
  MetricRow,
  OwnerProfile,
  OwnerRow,
  ProofEntryRow,
  ProofType,
  SiteCounts,
  SubjectType,
  TeamCardData,
  TeamKind,
  TeamMemberData,
  TeamProfile,
  TeamRow,
  TrustTier,
} from './types';

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

const CARD_METRIC_KEYS = ['uptime_pct', 'tasks_completed', 'success_rate'];

function cardMetricsFor(subjectType: SubjectType, ids: number[]): Map<number, MetricRow[]> {
  const map = new Map<number, MetricRow[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const keyPlaceholders = CARD_METRIC_KEYS.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT * FROM metrics WHERE subject_type=? AND subject_id IN (${placeholders}) AND key IN (${keyPlaceholders})
       ORDER BY CASE key WHEN 'uptime_pct' THEN 0 WHEN 'tasks_completed' THEN 1 ELSE 2 END`
    )
    .all(subjectType, ...ids, ...CARD_METRIC_KEYS) as MetricRow[];
  for (const row of rows) {
    const list = map.get(row.subject_id) ?? [];
    list.push(row);
    map.set(row.subject_id, list);
  }
  return map;
}

type AgentListRow = AgentRow & SubjectCounts & { owner_handle: string; owner_name: string };

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
      `SELECT a.*, o.handle AS owner_handle, o.display_name AS owner_name, ${COUNT_SELECTS('agent', 'a')}
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
  const cards = rows.map(
    (r): AgentCardData => ({
      slug: r.slug,
      name: r.name,
      avatar: r.avatar,
      tagline: r.tagline,
      category: r.category,
      platform: r.platform,
      status: r.status,
      ownerHandle: r.owner_handle,
      ownerName: r.owner_name,
      tier: computeTier(r.evidence_count, r.attestation_count),
      proofCount: r.proof_count,
      illustrative: r.illustrative === 1,
      metrics: metrics.get(r.id) ?? [],
    })
  );
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

// ---- list: teams ----------------------------------------------------------

type TeamListRow = TeamRow & SubjectCounts & { owner_handle: string; owner_name: string };

export function listTeams(ownerId?: number): TeamCardData[] {
  const rows = getDb()
    .prepare(
      `SELECT tm.*, o.handle AS owner_handle, o.display_name AS owner_name, ${COUNT_SELECTS('team', 'tm')}
       FROM teams tm JOIN owners o ON o.id = tm.owner_id
       ${ownerId !== undefined ? 'WHERE tm.owner_id = ?' : ''}
       ORDER BY tm.featured DESC, proof_count DESC, tm.name COLLATE NOCASE ASC
       LIMIT 100`
    )
    .all(...(ownerId !== undefined ? [ownerId] : [])) as TeamListRow[];

  const metrics = cardMetricsFor(
    'team',
    rows.map((r) => r.id)
  );
  const memberStmt = getDb().prepare(
    `SELECT a.slug, a.name, a.avatar, m.role FROM team_members m
     JOIN agents a ON a.id = m.agent_id WHERE m.team_id = ? ORDER BY m.ordinal`
  );
  return rows.map(
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
      illustrative: r.illustrative === 1,
      members: memberStmt.all(r.id) as TeamCardData['members'],
      metrics: metrics.get(r.id) ?? [],
    })
  );
}

// ---- profiles -------------------------------------------------------------

function subjectExtras(subjectType: SubjectType, id: number) {
  const db = getDb();
  const metrics = db
    .prepare('SELECT * FROM metrics WHERE subject_type=? AND subject_id=? ORDER BY id')
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
  const teams = db
    .prepare(
      `SELECT t.slug, t.name, t.avatar, t.kind, m.role FROM team_members m
       JOIN teams t ON t.id = m.team_id WHERE m.agent_id=? ORDER BY t.name`
    )
    .all(agent.id) as AgentProfile['teams'];
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
    teams,
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
      `SELECT a.slug, a.name, a.avatar, a.tagline, m.role, m.role_detail AS roleDetail, m.ordinal
       FROM team_members m JOIN agents a ON a.id = m.agent_id
       WHERE m.team_id=? ORDER BY m.ordinal`
    )
    .all(team.id) as TeamMemberData[];
  return { team, owner, tier, members, metrics, proof, attestations };
}

export function getOwnerProfile(handle: string): OwnerProfile | null {
  const owner = getDb().prepare('SELECT * FROM owners WHERE handle=?').get(handle) as
    | OwnerRow
    | undefined;
  if (!owner) return null;
  return { owner, agents: listAgents({ ownerId: owner.id }), teams: listTeams(owner.id) };
}

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

export function getFeatured(): { agents: AgentCardData[]; teams: TeamCardData[] } {
  const slugsOf = (sql: string): Set<string> =>
    new Set((getDb().prepare(sql).all() as { slug: string }[]).map((r) => r.slug));
  const featuredAgents = slugsOf('SELECT slug FROM agents WHERE featured=1');
  const featuredTeams = slugsOf('SELECT slug FROM teams WHERE featured=1');
  return {
    agents: listAgents({ limit: 100 })
      .filter((a) => featuredAgents.has(a.slug))
      .slice(0, 6),
    teams: listTeams()
      .filter((t) => featuredTeams.has(t.slug))
      .slice(0, 2),
  };
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

export interface ContactInput {
  subjectType: ContactSubjectType;
  subjectSlug: string; // owner handle when subjectType === 'owner'
  requesterName: string;
  requesterEmail: string;
  message: string;
}

export function createContactRequest(input: ContactInput): { id: number } {
  const db = getDb();
  const table =
    input.subjectType === 'agent' ? 'agents' : input.subjectType === 'team' ? 'teams' : 'owners';
  const column = input.subjectType === 'owner' ? 'handle' : 'slug';
  const subject = db.prepare(`SELECT id FROM ${table} WHERE ${column}=?`).get(input.subjectSlug) as
    | { id: number }
    | undefined;
  if (!subject) throw new Error(`Unknown ${input.subjectType}: ${input.subjectSlug}`);
  const res = db
    .prepare(
      `INSERT INTO contact_requests (subject_type, subject_id, requester_name, requester_email, message)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.subjectType, subject.id, input.requesterName, input.requesterEmail, input.message);
  return { id: Number(res.lastInsertRowid) };
}

export type { TeamKind };
