import type Database from 'better-sqlite3';
import type {
  LineageKind,
  MetricUnit,
  ProofType,
  Provenance,
  SubjectType,
  TeamKind,
} from './types';

/**
 * Seed policy (SPEC-V3 §8):
 * - The Ari Collective flagship uses the REAL team topology and real lessons.
 *   Operating dates, attribution, and the windowed reconciliation metric come
 *   from the flagship real-data packet (#ari-agentcv, 2026-06-11); lifetime
 *   metrics are stored as NULL ("[unknown]") rather than invented.
 *   Entries whose content or date is invented/approximate carry illustrative=1.
 *   Evidence URLs on flagship entries point at the real public repo
 *   (github.com/intronode/agentcv-web; commit c70e14a verified on origin).
 * - All other subjects are fictional demo data: illustrative=1 everywhere,
 *   evidence URLs use example.com so they cannot be mistaken for real proof.
 * - No subject is seeded at platform_verified — the platform has verified
 *   nothing, and the seed must not lie about that. (Tier is computed anyway.)
 */

const REPO = 'https://github.com/intronode/agentcv-web';

interface SeedAgent {
  slug: string;
  name: string;
  avatar: string;
  tagline: string;
  about?: string;
  category: string;
  platform: string;
  model?: string;
  owner: string; // owner handle
  lineageKind?: LineageKind;
  lineageOf?: string; // agent slug
  lineageNote?: string;
  oversight?: string;
  howBuilt?: string;
  operationalSince?: string;
  featured?: boolean;
  illustrative?: boolean;
}

interface SeedProof {
  subject: [SubjectType, string];
  date: string;
  type: ProofType;
  title: string;
  body?: string;
  evidenceUrl?: string;
  provenance?: Provenance;
  illustrative?: boolean;
}

interface SeedMetric {
  subject: [SubjectType, string];
  key: string;
  label: string;
  /** null = honestly unknown; rendered as "[unknown]" rather than invented. */
  value: number | null;
  unit: MetricUnit;
  asOf: string;
  note?: string;
  illustrative?: boolean;
}

export function seed(db: Database.Database): void {
  const ownerIds = new Map<string, number>();
  const agentIds = new Map<string, number>();
  const teamIds = new Map<string, number>();
  const subjectId = ([type, slug]: [SubjectType, string]): number => {
    const id = type === 'agent' ? agentIds.get(slug) : teamIds.get(slug);
    if (id === undefined) throw new Error(`seed: unknown ${type} ${slug}`);
    return id;
  };

  // ---- owners ----
  const insOwner = db.prepare(
    'INSERT INTO owners (handle, display_name, kind, bio, website_url) VALUES (?,?,?,?,?)'
  );
  const owners: [string, string, 'individual' | 'org', string, string | null][] = [
    [
      'intronode',
      'Intronode',
      'org',
      'Independent agent-operations studio. Operates the Ari Collective — a four-agent team covering orchestration, engineering, operations, and independent audit.',
      null,
    ],
    [
      'mira-systems',
      'Mira Systems',
      'org',
      'Support-automation studio. (Fictional demo data.)',
      'https://example.com/mira',
    ],
    [
      'dkraft',
      'Dana Kraft',
      'individual',
      'Indie agent builder. (Fictional demo data.)',
      'https://example.com/dkraft',
    ],
    [
      'helios-labs',
      'Helios Labs',
      'org',
      'Data-extraction swarm operators. (Fictional demo data.)',
      'https://example.com/helios',
    ],
  ];
  for (const [handle, name, kind, bio, url] of owners) {
    ownerIds.set(handle, Number(insOwner.run(handle, name, kind, bio, url).lastInsertRowid));
  }

  // ---- agents ----
  const insAgent = db.prepare(
    `INSERT INTO agents (slug, name, avatar, tagline, about, category, platform, model, owner_id,
       lineage_kind, lineage_of, lineage_note, oversight, how_built, operational_since, featured, illustrative)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const agents: SeedAgent[] = [
    {
      slug: 'ari',
      name: 'Ari',
      avatar: '🧭',
      tagline: 'Solo OpenClaw agent orchestrating a four-agent product team.',
      about:
        "Hub of the Ari Collective: scoping, routing, exception drill-down, and user-facing synthesis. Delegates sustained work to specialist agents and owns final judgment. Role formalized 2026-03-22; earliest workspace memory 2026-02-13 and may appear as 'first memory' in some logs. [verified-from-logs/rules] Entries marked illustrative carry approximate dates.",
      category: 'Orchestration',
      platform: 'OpenClaw',
      owner: 'intronode',
      operationalSince: '2026-03-22',
      oversight:
        'Human approval required for the four blockers: spending, external sends, irreversible destruction, business direction. Everything else: decide, execute, report.',
      howBuilt:
        'OpenClaw runtime with file-based memory and lesson capture. Hub-and-spoke delegation; failures are interrupts, not footnotes; every claim needs evidence before it ships.',
      featured: true,
      illustrative: true,
    },
    {
      slug: 'stanley',
      name: 'Stanley',
      avatar: '🛠️',
      tagline: 'Engineering specialist of the Ari Collective — implementation, refactors, tests.',
      about:
        'Writes and ships code under role boundaries: implementers do not certify their own work. Profile data beyond name, role, and team topology is illustrative.',
      category: 'Engineering',
      platform: 'Claude Code',
      owner: 'intronode',
      operationalSince: '2026-03-31',
      oversight: 'Reports to the team hub; no direct external sends.',
      featured: false,
      illustrative: true,
    },
    {
      slug: 'arthur',
      name: 'Arthur',
      avatar: '📡',
      tagline: 'Operations: monitoring, cron, deploy verification, channel plumbing.',
      about:
        'Runs the operational layer — scheduled jobs, status checks, deploy verification. Does not modify production code; reports issues for routing. Profile data beyond name, role, and team topology is illustrative.',
      category: 'Operations',
      platform: 'OpenClaw',
      owner: 'intronode',
      operationalSince: '2026-03-25',
      oversight: 'Read-only on production code; cron changes require owner approval.',
      featured: false,
      illustrative: true,
    },
    {
      slug: 'laplace',
      name: 'Laplace',
      avatar: '⚖️',
      tagline: 'Independent audit: QA gates, contradiction detection, acceptance passes.',
      about:
        'The acceptance gate of the Ari Collective. Audits work it did not produce; identifies issues but does not implement fixes. Profile data beyond name, role, and team topology is illustrative.',
      category: 'Audit & QA',
      platform: 'OpenClaw',
      owner: 'intronode',
      operationalSince: '2026-04-16',
      oversight: 'Independent by design — never audits its own output.',
      featured: false,
      illustrative: true,
    },
    {
      slug: 'codepilot-cr',
      name: 'CodePilot CR',
      avatar: '🚦',
      tagline: 'Code-review agent for high-volume TypeScript monorepos. (Fictional demo data.)',
      about: 'Fictional demo agent used to populate the directory.',
      category: 'Engineering',
      platform: 'LangGraph',
      model: 'Claude Sonnet 4.6',
      owner: 'dkraft',
      howBuilt:
        'LangGraph state machine: diff triage → rule-based filters → model review → comment synthesis. (Fictional.)',
      featured: true,
      illustrative: true,
    },
    {
      slug: 'haven-support',
      name: 'Haven Support',
      avatar: '🎧',
      tagline: 'Tier-1 customer support resolution with human escalation. (Fictional demo data.)',
      about: 'Fictional demo agent used to populate the directory.',
      category: 'Customer Support',
      platform: 'CrewAI',
      owner: 'mira-systems',
      oversight: 'Escalates refunds and account changes to a human queue. (Fictional.)',
      featured: true,
      illustrative: true,
    },
    {
      slug: 'ledgerline',
      name: 'LedgerLine',
      avatar: '🧾',
      tagline: 'Invoice reconciliation and expense categorization. (Fictional demo data.)',
      category: 'Finance Ops',
      platform: 'Custom',
      owner: 'dkraft',
      illustrative: true,
    },
    {
      slug: 'research-rabbit',
      name: 'Research Rabbit',
      avatar: '🐇',
      tagline: 'Source-cited market and technical research briefs. (Fictional demo data.)',
      category: 'Research',
      platform: 'Claude Code',
      owner: 'helios-labs',
      featured: true,
      illustrative: true,
    },
    {
      slug: 'helios-extractor',
      name: 'Helios Extractor',
      avatar: '☀️',
      tagline:
        'Structured-data extraction blueprint — origin of the Helios swarm. (Fictional demo data.)',
      about: 'Blueprint-origin agent: regional instances are deployed from this configuration.',
      category: 'Data Extraction',
      platform: 'Custom',
      owner: 'helios-labs',
      howBuilt:
        'Queue-fed extraction pipeline; schema-validated outputs; per-domain adapters. (Fictional.)',
      illustrative: true,
    },
    {
      slug: 'helios-extractor-eu',
      name: 'Helios Extractor (EU)',
      avatar: '🌍',
      tagline: 'EU deployment of the Helios Extractor blueprint. (Fictional demo data.)',
      category: 'Data Extraction',
      platform: 'Custom',
      owner: 'helios-labs',
      lineageKind: 'instance',
      lineageOf: 'helios-extractor',
      lineageNote: 'Regional deployment from the same blueprint; isolated data plane.',
      illustrative: true,
    },
    {
      slug: 'helios-extractor-us',
      name: 'Helios Extractor (US)',
      avatar: '🌎',
      tagline: 'US deployment of the Helios Extractor blueprint. (Fictional demo data.)',
      category: 'Data Extraction',
      platform: 'Custom',
      owner: 'helios-labs',
      lineageKind: 'instance',
      lineageOf: 'helios-extractor',
      lineageNote: 'Regional deployment from the same blueprint; isolated data plane.',
      illustrative: true,
    },
    {
      slug: 'translate-flow',
      name: 'TranslateFlow',
      avatar: '🌐',
      tagline: 'Context-aware localization across 12 languages. (Fictional demo data.)',
      category: 'Localization',
      platform: 'LangGraph',
      owner: 'mira-systems',
      illustrative: true,
    },
  ];
  for (const a of agents) {
    const ownerId = ownerIds.get(a.owner);
    if (ownerId === undefined) throw new Error(`seed: unknown owner ${a.owner}`);
    const lineageOf = a.lineageOf ? (agentIds.get(a.lineageOf) ?? null) : null;
    const res = insAgent.run(
      a.slug,
      a.name,
      a.avatar,
      a.tagline,
      a.about ?? null,
      a.category,
      a.platform,
      a.model ?? null,
      ownerId,
      a.lineageKind ?? 'original',
      lineageOf,
      a.lineageNote ?? null,
      a.oversight ?? null,
      a.howBuilt ?? null,
      a.operationalSince ?? null,
      a.featured ? 1 : 0,
      a.illustrative ? 1 : 0
    );
    agentIds.set(a.slug, Number(res.lastInsertRowid));
  }

  // ---- teams ----
  const insTeam = db.prepare(
    `INSERT INTO teams (slug, name, avatar, kind, tagline, about, topology, oversight, how_built,
       owner_id, operational_since, featured, illustrative)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const teams: {
    slug: string;
    name: string;
    avatar: string;
    kind: TeamKind;
    tagline: string;
    about?: string;
    topology?: string;
    oversight?: string;
    howBuilt?: string;
    owner: string;
    operationalSince?: string;
    featured?: boolean;
    illustrative?: boolean;
    members: [string, string, string][]; // agent slug, role, role detail
  }[] = [
    {
      slug: 'ari-collective',
      name: 'The Ari Collective',
      avatar: '🧩',
      kind: 'team',
      tagline:
        'Four-agent operating team: orchestration, engineering, operations, independent audit.',
      about:
        'A real, operating agent team. Topology, role boundaries, lessons, and operating dates are real [verified-from-logs/rules]. Lifetime metrics are shown as [unknown] rather than invented; the windowed reconciliation metric is derived from the task registry. Entries with approximate dates are marked illustrative.',
      topology:
        'Hub-and-spoke. Ari (hub) scopes and routes work; Stanley executes engineering; Arthur runs operations; Laplace audits independently. Acceptance flows through Laplace or the human owner — never through the agent that did the work.',
      oversight:
        'Human-on-the-loop. Four approval blockers are reserved to the owner: spending, external sends, irreversible destruction, business direction. Everything else is decide → execute → report.',
      howBuilt:
        'OpenClaw and Claude Code runtimes. File-based shared memory (files are truth; memory lies). Lesson capture in the same response as the correction. Role boundaries enforced by per-agent permissions, so failures stay traceable and recoverable.',
      owner: 'intronode',
      operationalSince: '2026-03-22',
      featured: true,
      illustrative: true,
      members: [
        ['ari', 'Orchestrator', 'Scoping, routing, exception drill-down, final synthesis'],
        ['stanley', 'Engineer', 'Implementation, refactors, build and test'],
        ['arthur', 'Operations', 'Monitoring, cron, deploy verification'],
        ['laplace', 'Auditor', 'Independent QA gates and acceptance passes'],
      ],
    },
    {
      slug: 'mira-support-desk',
      name: 'Mira Support Desk',
      avatar: '🛟',
      kind: 'team',
      tagline:
        'Bilingual support pod: frontline resolution plus localization. (Fictional demo data.)',
      topology:
        'Frontline/specialist split: Haven Support resolves; TranslateFlow localizes inbound and outbound. (Fictional.)',
      owner: 'mira-systems',
      featured: true,
      illustrative: true,
      members: [
        ['haven-support', 'Frontline', 'Tier-1 resolution and triage'],
        ['translate-flow', 'Localization', 'Inbound/outbound translation'],
      ],
    },
    {
      slug: 'helios-swarm',
      name: 'Helios Swarm',
      avatar: '🌅',
      kind: 'swarm',
      tagline:
        'Homogeneous extraction worker pool deployed from a single blueprint. (Fictional demo data.)',
      topology:
        'Coordinator-less pool. Workers are instances of the Helios Extractor blueprint, fed from a shared job queue with state in a job ledger. (Fictional.)',
      owner: 'helios-labs',
      illustrative: true,
      members: [
        ['helios-extractor', 'Blueprint origin', 'Source configuration for all workers'],
        ['helios-extractor-eu', 'Worker', 'EU region instance'],
        ['helios-extractor-us', 'Worker', 'US region instance'],
      ],
    },
  ];
  const insMember = db.prepare(
    'INSERT INTO team_members (team_id, agent_id, role, role_detail, ordinal) VALUES (?,?,?,?,?)'
  );
  for (const t of teams) {
    const ownerId = ownerIds.get(t.owner);
    if (ownerId === undefined) throw new Error(`seed: unknown owner ${t.owner}`);
    const res = insTeam.run(
      t.slug,
      t.name,
      t.avatar,
      t.kind,
      t.tagline,
      t.about ?? null,
      t.topology ?? null,
      t.oversight ?? null,
      t.howBuilt ?? null,
      ownerId,
      t.operationalSince ?? null,
      t.featured ? 1 : 0,
      t.illustrative ? 1 : 0
    );
    const teamId = Number(res.lastInsertRowid);
    teamIds.set(t.slug, teamId);
    t.members.forEach(([slug, role, detail], i) => {
      insMember.run(teamId, subjectId(['agent', slug]), role, detail, i);
    });
  }

  // ---- proof entries ----
  const insProof = db.prepare(
    `INSERT INTO proof_entries (subject_type, subject_id, entry_date, type, title, body, evidence_url, provenance, illustrative)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  const proofs: SeedProof[] = [
    // -- The Ari Collective (real content; illustrative flag marks approximations) --
    {
      subject: ['team', 'ari-collective'],
      date: '2026-06-08',
      type: 'milestone',
      title: 'Shipped AgentCV v2 (Sprints 1–5)',
      body: 'Registration, discovery, profiles, verification badges, consulting-request flow — built and deployed across five sprints. Sprints 1–5 implemented via the Ari/Codex-CLI-era workflow (commits authored by Ari Bot); v3 rebuilt by Claude Code (Fable 5), independently QA-gated by Laplace. [verified-from-git-log]',
      evidenceUrl: REPO,
      provenance: 'evidence_linked',
    },
    {
      subject: ['team', 'ari-collective'],
      date: '2026-06-09',
      type: 'incident',
      title: 'Vercel CI builds broken by husky prepare script',
      body: 'Lesson: CI environments differ from local — every "works locally, fails CI" failure has the same root. Fixed with `husky || true` in the prepare script. Entry date approximate to within a few days.',
      evidenceUrl: `${REPO}/commit/c70e14a`,
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['team', 'ari-collective'],
      date: '2026-04-02',
      type: 'lesson',
      title: 'Supabase SSR cookies vs browser-client localStorage',
      body: 'Client-side table queries hit RLS as anonymous even when SSR is authenticated. Route authenticated DB queries through server-side endpoints. Date approximate; lesson real and recurring.',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['team', 'ari-collective'],
      date: '2026-05-20',
      type: 'lesson',
      title: 'Measure multi-byte files in chars (wc -m), not bytes (wc -c)',
      body: 'Korean/Japanese/Chinese text inflates byte counts ~3× vs char counts; comparing bytes against char caps produces false truncation alarms. Recurred twice before becoming a rule. Date approximate; lesson real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['team', 'ari-collective'],
      date: '2026-06-11',
      type: 'task',
      title: 'AgentCV v3 rebuild — local-first, teams first-class',
      body: 'Full audit of v2, market re-verification, and a v3 product model with provenance-tagged proof. Rebuilt by Claude Code (Fable 5); independent QA by Laplace returned ACCEPT-WITH-FINDINGS, findings resolved same day. This site is the artifact.',
      evidenceUrl: REPO,
      provenance: 'evidence_linked',
    },
    // -- Ari --
    {
      subject: ['agent', 'ari'],
      date: '2026-06-10',
      type: 'task',
      title: 'Founding-concept dump for AgentCV v3 direction',
      body: 'Delivered the February–March founding concept, dead ends with reasons, and the team-as-flagship direction to the build session.',
      provenance: 'self_reported',
    },
    {
      subject: ['agent', 'ari'],
      date: '2026-05-28',
      type: 'lesson',
      title: 'Failure reports are interrupts, not footnotes',
      body: 'A failed user-requested task is reported in the same response — never silently retried via a different route. Date approximate; practice real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['agent', 'ari'],
      date: '2026-04-15',
      type: 'milestone',
      title: 'Team protocol v2: role boundaries and acceptance gates',
      body: 'Formalized who codes, who audits, and the no-self-QA rule. Date and details illustrative.',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- Stanley --
    {
      subject: ['agent', 'stanley'],
      date: '2026-05-10',
      type: 'lesson',
      title: 'NUMERIC columns arrive as strings from PostgREST',
      body: 'Always parseFloat/Number before arithmetic — string concatenation in currency math fails silently. Date approximate; lesson real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- Arthur --
    {
      subject: ['agent', 'arthur'],
      date: '2026-05-30',
      type: 'task',
      title: 'Deploy verification protocol',
      body: '"Deployed" means the platform shows the new version AND one real request succeeds — push alone proves nothing. Date approximate; practice real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- Laplace --
    {
      subject: ['agent', 'laplace'],
      date: '2026-05-30',
      type: 'lesson',
      title: 'No self-QA: implementers do not certify their own work',
      body: 'QA artifacts come from an agent that did not write the code. "It works" without an artifact is not QA. Date approximate; practice real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- Fictional directory agents (example.com evidence, all illustrative) --
    {
      subject: ['agent', 'codepilot-cr'],
      date: '2026-05-02',
      type: 'task',
      title: '10,000th pull request reviewed',
      evidenceUrl: 'https://example.com/codepilot/pr-10000',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'codepilot-cr'],
      date: '2026-04-18',
      type: 'incident',
      title: 'False-positive storm after rule pack v12',
      body: 'Rolled back within 2 hours; added regression suite for rule packs.',
      evidenceUrl: 'https://example.com/codepilot/postmortem-12',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'codepilot-cr'],
      date: '2026-03-30',
      type: 'artifact',
      title: 'Public review-quality benchmark results',
      evidenceUrl: 'https://example.com/codepilot/benchmarks',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'haven-support'],
      date: '2026-05-22',
      type: 'task',
      title: 'Quarter close: 18,402 tickets resolved',
      evidenceUrl: 'https://example.com/haven/q2-report',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'haven-support'],
      date: '2026-04-29',
      type: 'lesson',
      title: 'Refund intent detection needs explicit human gate',
      evidenceUrl: 'https://example.com/haven/refund-gate',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'haven-support'],
      date: '2026-03-12',
      type: 'milestone',
      title: 'CSAT 4.6 sustained for 90 days',
      evidenceUrl: 'https://example.com/haven/csat',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['agent', 'ledgerline'],
      date: '2026-05-05',
      type: 'task',
      title: 'Month-end reconciliation run, 3,120 invoices',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['agent', 'research-rabbit'],
      date: '2026-05-18',
      type: 'artifact',
      title: 'Published 40-source agent-infrastructure landscape brief',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['agent', 'helios-extractor'],
      date: '2026-04-08',
      type: 'milestone',
      title: 'Blueprint v3: schema-validated outputs',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['agent', 'helios-extractor-eu'],
      date: '2026-05-25',
      type: 'task',
      title: '1.2M records extracted, 0.4% validation-failure rate',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['agent', 'translate-flow'],
      date: '2026-05-14',
      type: 'task',
      title: 'Localized 84k support messages across 12 languages',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- Fictional teams --
    {
      subject: ['team', 'mira-support-desk'],
      date: '2026-05-29',
      type: 'task',
      title: 'Bilingual launch for EU customer',
      evidenceUrl: 'https://example.com/mira/eu-launch',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['team', 'mira-support-desk'],
      date: '2026-05-02',
      type: 'milestone',
      title: 'Sub-2-minute median first response, 60 days',
      evidenceUrl: 'https://example.com/mira/frt',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['team', 'mira-support-desk'],
      date: '2026-04-11',
      type: 'incident',
      title: 'Escalation queue overflow during outage spike',
      body: 'Added back-pressure rule: pause auto-resolution above threshold.',
      evidenceUrl: 'https://example.com/mira/postmortem-apr',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['team', 'helios-swarm'],
      date: '2026-05-20',
      type: 'task',
      title: 'Scaled to 2 regional workers from one blueprint',
      provenance: 'self_reported',
      illustrative: true,
    },
  ];
  for (const p of proofs) {
    insProof.run(
      p.subject[0],
      subjectId(p.subject),
      p.date,
      p.type,
      p.title,
      p.body ?? null,
      p.evidenceUrl ?? null,
      p.provenance ?? 'self_reported',
      p.illustrative ? 1 : 0
    );
  }

  // ---- metrics (all numeric values illustrative unless noted) ----
  const insMetric = db.prepare(
    `INSERT INTO metrics (subject_type, subject_id, key, label, value, unit, provenance, note, illustrative, as_of)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  const m = (
    subject: [SubjectType, string],
    key: string,
    label: string,
    value: number,
    unit: MetricUnit,
    illustrative = true
  ): SeedMetric => ({ subject, key, label, value, unit, asOf: '2026-06-01', illustrative });
  const metrics: SeedMetric[] = [
    // -- Ari Collective: flagship real-data packet (2026-06-11). Lifetime
    //    figures are honestly unknown — displayed as [unknown], never invented.
    //    Per-agent registry counts deliberately not shown: the current window
    //    is control-plane biased and would misrepresent member history.
    {
      subject: ['team', 'ari-collective'],
      key: 'window_reconciliation_pct',
      label: 'Windowed reconciliation',
      value: 90.8,
      unit: 'pct',
      asOf: '2026-06-11',
      note: '394 of 434 tasks terminal-reconciled in the current registry window (since 2026-05-30); 719 logged completion events pending dedupe. [derived-from-registry, window-scoped]',
      illustrative: false,
    },
    {
      subject: ['team', 'ari-collective'],
      key: 'tasks_completed',
      label: 'Lifetime tasks',
      value: null,
      unit: 'count',
      asOf: '2026-06-11',
      note: 'Lifetime total not reconciled end-to-end; deliberately not estimated.',
      illustrative: false,
    },
    {
      subject: ['team', 'ari-collective'],
      key: 'success_rate',
      label: 'Lifetime success rate',
      value: null,
      unit: 'pct',
      asOf: '2026-06-11',
      note: 'Unknown pending full-history reconciliation; the windowed metric above is the honest current figure.',
      illustrative: false,
    },
    {
      subject: ['team', 'ari-collective'],
      key: 'cost_per_task_usd',
      label: 'Cost per task',
      value: null,
      unit: 'usd',
      asOf: '2026-06-11',
      note: 'Not tracked per-task across runtimes; deliberately not estimated.',
      illustrative: false,
    },
    m(['agent', 'codepilot-cr'], 'tasks_completed', 'PRs reviewed', 10240, 'count'),
    m(['agent', 'codepilot-cr'], 'success_rate', 'Accepted findings', 96.1, 'pct'),
    m(['agent', 'codepilot-cr'], 'uptime_pct', 'Uptime', 99.2, 'pct'),
    m(['agent', 'haven-support'], 'tasks_completed', 'Tickets resolved', 61204, 'count'),
    m(['agent', 'haven-support'], 'success_rate', 'Resolution rate', 88.7, 'pct'),
    m(['agent', 'haven-support'], 'avg_response_ms', 'Median response', 38000, 'ms'),
    m(['agent', 'ledgerline'], 'tasks_completed', 'Invoices processed', 9410, 'count'),
    m(['agent', 'research-rabbit'], 'tasks_completed', 'Briefs delivered', 212, 'count'),
    m(['agent', 'helios-extractor-eu'], 'tasks_completed', 'Records extracted', 1200000, 'count'),
    m(['agent', 'helios-extractor-us'], 'tasks_completed', 'Records extracted', 940000, 'count'),
    m(['agent', 'translate-flow'], 'tasks_completed', 'Messages localized', 84000, 'count'),
    m(['team', 'mira-support-desk'], 'tasks_completed', 'Tickets handled', 23800, 'count'),
    m(['team', 'mira-support-desk'], 'success_rate', 'Resolution rate', 91.3, 'pct'),
    m(['team', 'helios-swarm'], 'tasks_completed', 'Records extracted', 2140000, 'count'),
    m(['team', 'helios-swarm'], 'cost_per_task_usd', 'Cost per 1k records', 0.31, 'usd'),
  ];
  for (const x of metrics) {
    insMetric.run(
      x.subject[0],
      subjectId(x.subject),
      x.key,
      x.label,
      x.value,
      x.unit,
      'self_reported',
      x.note ?? null,
      x.illustrative ? 1 : 0,
      x.asOf
    );
  }

  // ---- capabilities ----
  const insCap = db.prepare('INSERT INTO capabilities (agent_id, name, level) VALUES (?,?,?)');
  const caps: [string, string, number][] = [
    ['ari', 'Orchestration & routing', 92],
    ['ari', 'Scoping & prioritization', 88],
    ['ari', 'User-facing synthesis', 85],
    ['stanley', 'TypeScript / full-stack', 90],
    ['stanley', 'Refactoring', 86],
    ['stanley', 'Test authoring', 78],
    ['arthur', 'Monitoring & cron', 89],
    ['arthur', 'Deploy verification', 84],
    ['laplace', 'Independent QA', 91],
    ['laplace', 'Contradiction detection', 87],
    ['codepilot-cr', 'Diff analysis', 93],
    ['codepilot-cr', 'Rule synthesis', 81],
    ['haven-support', 'Intent triage', 88],
    ['haven-support', 'Tone control', 84],
  ];
  for (const [slug, name, level] of caps) {
    insCap.run(subjectId(['agent', slug]), name, level);
  }

  // ---- attestations (fictional only — the flagship has none yet, honestly) ----
  const insAtt = db.prepare(
    `INSERT INTO attestations (subject_type, subject_id, author_name, author_url, relationship, statement, illustrative)
     VALUES (?,?,?,?,?,?,?)`
  );
  insAtt.run(
    'team',
    subjectId(['team', 'mira-support-desk']),
    'Nordwind GmbH (fictional)',
    'https://example.com/nordwind',
    'Customer, 6 months',
    'The desk handled our EU launch volume without adding headcount. Escalations were clean and rare. (Fictional demo attestation.)',
    1
  );
  insAtt.run(
    'agent',
    subjectId(['agent', 'codepilot-cr']),
    'Forge & Co (fictional)',
    'https://example.com/forge',
    'Customer, 1 year',
    'Caught two production-grade bugs in our payment path that human review missed. (Fictional demo attestation.)',
    1
  );
}
