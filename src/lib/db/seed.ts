import type Database from 'better-sqlite3';
import type {
  LineageKind,
  MetricUnit,
  ProofType,
  Provenance,
  SeedLayer,
  SubjectType,
  TopologyType,
  ConfigKind,
} from './types';

/**
 * Seed policy (SPEC-V4 §4):
 * - The Ari Collective flagship uses the REAL configuration topology and real lessons.
 *   Operating dates, attribution, and the windowed reconciliation metric come
 *   from the flagship real-data packet (#ari-agentcv, 2026-06-11); lifetime
 *   metrics are stored as NULL ("[unknown]") rather than invented.
 *   Entries whose content or date is invented/approximate carry illustrative=1.
 *   Evidence URLs on flagship entries point at the real public repo
 *   (github.com/intronode/agentcv-web; commit c70e14a verified on origin).
 * - CURATED entries are documented from cited public sources. source_url is required.
 *   Metrics are stated only as the source states them. Prose paraphrases the source;
 *   nothing is invented. Owner bio states: "Profile curated from public sources;
 *   not claimed by the organization."
 * - ILLUSTRATIVE entries are clearly labeled fictional demo data.
 *   Evidence URLs use example.com so they cannot be mistaken for real proof.
 * - No subject is seeded at platform_verified — the platform has verified
 *   nothing, and the seed must not lie about that. (Tier is computed anyway.)
 * - subject_type: 'configuration' is used throughout (v3 'team' is gone).
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
  seedLayer?: SeedLayer;
  sourceUrl?: string;
  sourceName?: string;
}

interface SeedConfiguration {
  slug: string;
  name: string;
  avatar: string;
  kind: ConfigKind;
  tagline: string;
  about?: string;
  topology?: string;
  oversight?: string;
  howBuilt?: string;
  owner: string;
  operationalSince?: string;
  featured?: boolean;
  seedLayer?: SeedLayer;
  sourceUrl?: string;
  sourceName?: string;
  // v4 comparable fields
  topologyType?: TopologyType;
  agentCount?: number;
  platform?: string;
  industries?: string[];
  taskKinds?: string[];
  whyItWorks?: string;
  members: [string, string, string][]; // agent slug, role, role detail
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
  provenance?: Provenance;
}

export function seed(db: Database.Database): void {
  const ownerIds = new Map<string, number>();
  const agentIds = new Map<string, number>();
  const configIds = new Map<string, number>();
  const subjectId = ([type, slug]: [SubjectType, string]): number => {
    const id = type === 'agent' ? agentIds.get(slug) : configIds.get(slug);
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
    // --- CURATED org owners (public sources; not claimed by the organizations) ---
    [
      'anthropic',
      'Anthropic',
      'org',
      'Profile curated from public sources; not claimed by the organization. Anthropic PBC is an AI safety company and the maker of Claude.',
      'https://www.anthropic.com',
    ],
    [
      'microsoft-research',
      'Microsoft Research',
      'org',
      'Profile curated from public sources; not claimed by the organization. Microsoft Research is the research division of Microsoft Corporation.',
      'https://www.microsoft.com/en-us/research',
    ],
    [
      'gpt-engineer-org',
      'Academic / Open-Source (ChatDev & MetaGPT)',
      'org',
      'Profile curated from public sources; not claimed by the organizations. Covers publicly documented academic multi-agent systems (ChatDev, MetaGPT) from their published arXiv papers.',
      'https://arxiv.org',
    ],
    [
      'crewai-inc',
      'CrewAI',
      'org',
      'Profile curated from public sources; not claimed by the organization. CrewAI is an open-source multi-agent orchestration framework.',
      'https://www.crewai.com',
    ],
    // --- ILLUSTRATIVE additional owners ---
    [
      'nexus-content',
      'Nexus Content Co.',
      'org',
      'Content-pipeline studio. (Fictional demo data.)',
      'https://example.com/nexus',
    ],
    [
      'shopstream',
      'ShopStream',
      'org',
      'E-commerce operations collective. (Fictional demo data.)',
      'https://example.com/shopstream',
    ],
  ];
  for (const [handle, name, kind, bio, url] of owners) {
    ownerIds.set(handle, Number(insOwner.run(handle, name, kind, bio, url).lastInsertRowid));
  }

  // ---- agents ----
  const insAgent = db.prepare(
    `INSERT INTO agents (slug, name, avatar, tagline, about, category, platform, model, owner_id,
       lineage_kind, lineage_of, lineage_note, oversight, how_built, operational_since, featured,
       seed_layer, source_url, source_name)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const agents: SeedAgent[] = [
    // =========================================================
    // REAL — The Ari Collective members (unchanged from v3)
    // =========================================================
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
      seedLayer: 'real',
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
      seedLayer: 'real',
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
      seedLayer: 'real',
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
      seedLayer: 'real',
    },

    // =========================================================
    // CURATED — agents for documented public configurations
    // =========================================================

    // -- Anthropic orchestrator-workers pattern agents --
    {
      slug: 'anthropic-orchestrator',
      name: 'Orchestrator (Anthropic Pattern)',
      avatar: '🎯',
      tagline: 'Central LLM that breaks down tasks and delegates to worker LLMs.',
      about:
        'Documents the orchestrator role as described in Anthropic\'s "Building Effective Agents" guide: dynamically breaks down tasks, delegates to worker LLMs, and synthesizes results. Subtasks are determined based on input rather than predefined. Source: Anthropic engineering blog.',
      category: 'Orchestration',
      platform: 'Claude API',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://www.anthropic.com/research/building-effective-agents',
      sourceName: 'Anthropic — Building Effective Agents',
    },
    {
      slug: 'anthropic-worker',
      name: 'Worker Agent (Anthropic Pattern)',
      avatar: '⚙️',
      tagline: 'Specialist LLM executing delegated subtasks from an orchestrator.',
      about:
        'Documents the worker role in the orchestrator-workers pattern described by Anthropic. Workers receive dynamically determined subtasks and return results to the orchestrator. The pattern is recommended for coding tasks that affect multiple files or require parallel subtask execution. Source: Anthropic engineering blog.',
      category: 'Engineering',
      platform: 'Claude API',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://www.anthropic.com/research/building-effective-agents',
      sourceName: 'Anthropic — Building Effective Agents',
    },

    // -- Anthropic SWE-Bench solo agent --
    {
      slug: 'anthropic-swe-agent',
      name: 'Claude SWE-Bench Agent',
      avatar: '🔧',
      tagline: 'Single-agent software engineer — 49% on SWE-bench Verified.',
      about:
        'Documents the solo-plus-tools configuration Anthropic used to achieve 49% on SWE-bench Verified. Model: Claude 3.5 Sonnet (upgraded). Tools: Bash (persistent shell) and str_replace_editor (file editing). Design principle: "give as much control as possible to the language model itself, and keep the scaffolding minimal." The model determines its own workflow rather than following strict, discrete transitions. Source: Anthropic research page.',
      category: 'Engineering',
      platform: 'Claude API',
      model: 'Claude 3.5 Sonnet',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://www.anthropic.com/research/swe-bench-sonnet',
      sourceName: 'Anthropic — Claude SWE-bench Sonnet',
    },

    // -- Claude Code sub-agents --
    {
      slug: 'claude-code-lead',
      name: 'Claude Code Lead Agent',
      avatar: '🧑‍💻',
      tagline: 'Lead session coordinating Claude Code subagents across a codebase.',
      about:
        'Documents the lead-agent role in Claude Code\'s subagent system. The lead coordinates work, assigns subtasks, and merges results. Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions. As documented: "Spawn multiple Claude Code agents that work on different parts of a task simultaneously." Source: Claude Code official docs.',
      category: 'Orchestration',
      platform: 'Claude Code',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://code.claude.com/docs/en/sub-agents',
      sourceName: 'Claude Code Docs — Sub-agents',
    },
    {
      slug: 'claude-code-subagent',
      name: 'Claude Code Subagent',
      avatar: '🤖',
      tagline: 'Specialized sub-session handling a bounded task in its own context window.',
      about:
        'Documents the subagent role in Claude Code. Subagents preserve context by keeping exploration and implementation out of the main conversation, enforce constraints via tool allowlists, and can be routed to faster/cheaper models (e.g. Haiku) for cost control. Each subagent has its own context window; results are summarized back to the lead. Source: Claude Code official docs.',
      category: 'Engineering',
      platform: 'Claude Code',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://code.claude.com/docs/en/sub-agents',
      sourceName: 'Claude Code Docs — Sub-agents',
    },

    // -- Magentic-One agents (one slug per role) --
    {
      slug: 'magentic-orchestrator',
      name: 'Magentic-One Orchestrator',
      avatar: '🧠',
      tagline: 'Lead agent that plans, tracks progress, and re-plans for complex tasks.',
      about:
        'Documents the Orchestrator role in Magentic-One (Microsoft Research, arXiv 2411.04468). The Orchestrator "plans, tracks progress, and re-plans to recover from errors," directing four specialist agents. Default model: GPT-4o-2024-05-13. The system achieved GAIA 32.33% (±5.3) in default configuration. Source: arXiv paper.',
      category: 'Orchestration',
      platform: 'AutoGen',
      model: 'GPT-4o',
      owner: 'microsoft-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
    },
    {
      slug: 'magentic-websurfer',
      name: 'WebSurfer',
      avatar: '🌐',
      tagline: 'Web browsing specialist in the Magentic-One system.',
      about:
        'Documents the WebSurfer agent in Magentic-One (Microsoft Research, arXiv 2411.04468). Handles web navigation tasks as a specialist directed by the Orchestrator. Part of a five-agent system: Orchestrator, WebSurfer, FileSurfer, Coder, ComputerTerminal. Source: arXiv paper.',
      category: 'Research',
      platform: 'AutoGen',
      model: 'GPT-4o',
      owner: 'microsoft-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
    },
    {
      slug: 'magentic-filesurfer',
      name: 'FileSurfer',
      avatar: '📂',
      tagline: 'Local file navigation specialist in the Magentic-One system.',
      about:
        'Documents the FileSurfer agent in Magentic-One (Microsoft Research, arXiv 2411.04468). Handles local file operations as a specialist directed by the Orchestrator. Source: arXiv paper.',
      category: 'Operations',
      platform: 'AutoGen',
      model: 'GPT-4o',
      owner: 'microsoft-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
    },
    {
      slug: 'magentic-coder',
      name: 'Coder',
      avatar: '💻',
      tagline: 'Python code writing specialist in Magentic-One.',
      about:
        'Documents the Coder agent in Magentic-One (Microsoft Research, arXiv 2411.04468). Writes Python code as directed by the Orchestrator. Works alongside ComputerTerminal for code execution tasks. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'AutoGen',
      model: 'GPT-4o',
      owner: 'microsoft-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
    },
    {
      slug: 'magentic-terminal',
      name: 'ComputerTerminal',
      avatar: '🖥️',
      tagline: 'Code execution environment specialist in Magentic-One.',
      about:
        'Documents the ComputerTerminal agent in Magentic-One (Microsoft Research, arXiv 2411.04468). Executes code produced by the Coder agent. Together with the Coder, handles the programming tasks directed by the Orchestrator. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'AutoGen',
      model: 'GPT-4o',
      owner: 'microsoft-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
    },

    // -- MetaGPT agents (one slug per role — schema PK requires unique agent per config) --
    {
      slug: 'metagpt-pm',
      name: 'MetaGPT Product Manager',
      avatar: '📋',
      tagline: 'Creates PRDs and business analysis in the MetaGPT software pipeline.',
      about:
        "Documents the Product Manager role in MetaGPT (arXiv 2308.00352). Generates Product Requirement Documents with user stories and competitive analysis. Part of a five-agent SOP-encoded pipeline achieving 124.3 tokens per line of code vs ChatDev's 248.9. Source: arXiv paper.",
      category: 'Product',
      platform: 'MetaGPT',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
    },
    {
      slug: 'metagpt-architect',
      name: 'MetaGPT Architect',
      avatar: '📐',
      tagline: 'Technical specifications and system design in the MetaGPT pipeline.',
      about:
        'Documents the Architect role in MetaGPT (arXiv 2308.00352). Produces technical design documents based on PRD from the Product Manager. Part of the five-agent SOP-encoded pipeline. Communicates via shared message pool (publish-subscribe). Source: arXiv paper.',
      category: 'Engineering',
      platform: 'MetaGPT',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
    },
    {
      slug: 'metagpt-engineer',
      name: 'MetaGPT Engineer',
      avatar: '🔨',
      tagline: 'Implements code from specifications in the MetaGPT pipeline.',
      about:
        "Documents the Engineer role in MetaGPT (arXiv 2308.00352). Executes designated classes and functions based on specifications from Architect and Project Manager. Communicates via shared message pool (publish-subscribe). Pipeline executability score: 3.75/4 vs ChatDev's 2.25. Source: arXiv paper.",
      category: 'Engineering',
      platform: 'MetaGPT',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
    },
    {
      slug: 'metagpt-project-manager',
      name: 'MetaGPT Project Manager',
      avatar: '📊',
      tagline: 'Task decomposition and sprint assignment in the MetaGPT pipeline.',
      about:
        'Documents the Project Manager role in MetaGPT (arXiv 2308.00352). Decomposes technical specs into task lists and assigns work to Engineers. Part of the five-agent SOP-encoded pipeline. Source: arXiv paper.',
      category: 'Product',
      platform: 'MetaGPT',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
    },
    {
      slug: 'metagpt-qa',
      name: 'MetaGPT QA Engineer',
      avatar: '🧪',
      tagline: 'Test case formulation and validation in the MetaGPT pipeline.',
      about:
        'Documents the QA Engineer role in MetaGPT (arXiv 2308.00352). Formulates test cases and validates code quality as the final pipeline stage. HumanEval Pass@1: 85.9%; MBPP: 87.7%. Source: arXiv paper.',
      category: 'Audit & QA',
      platform: 'MetaGPT',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
    },

    // -- ChatDev agents (one slug per role) --
    {
      slug: 'chatdev-ceo',
      name: 'ChatDev CEO',
      avatar: '👔',
      tagline: 'Requirements and project direction in the ChatDev pipeline.',
      about:
        'Documents the CEO role in ChatDev (arXiv 2307.07924). Sets project direction and requirements in the design phase. Part of a three-phase pipeline (design → coding → testing) using dual-agent dialogue (instructor + assistant) at each subtask. Source: arXiv paper.',
      category: 'Product',
      platform: 'ChatDev',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
    },
    {
      slug: 'chatdev-cto',
      name: 'ChatDev CTO',
      avatar: '🏗️',
      tagline: 'Architecture decisions in the ChatDev pipeline.',
      about:
        'Documents the CTO role in ChatDev (arXiv 2307.07924). Makes architecture decisions in the design phase. Works with the CEO as an instructor/assistant pair. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'ChatDev',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
    },
    {
      slug: 'chatdev-programmer',
      name: 'ChatDev Programmer',
      avatar: '👨‍💻',
      tagline: 'Code-phase developer in the ChatDev communicative multi-agent pipeline.',
      about:
        'Documents the Programmer role in ChatDev (arXiv 2307.07924). Implements software in the coding phase under CTO direction. Communicates via dual-agent dialogue (instructor + assistant). Avg token usage per software task: 22,949 tokens in 148.2 seconds. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'ChatDev',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
    },
    {
      slug: 'chatdev-reviewer',
      name: 'ChatDev Reviewer',
      avatar: '🔎',
      tagline: 'Code inspection in the ChatDev pipeline.',
      about:
        'Documents the Reviewer role in ChatDev (arXiv 2307.07924). Inspects code written by the Programmer in the coding phase. Provides feedback as part of dual-agent dialogue with the Programmer. Source: arXiv paper.',
      category: 'Audit & QA',
      platform: 'ChatDev',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
    },
    {
      slug: 'chatdev-tester',
      name: 'ChatDev Tester',
      avatar: '🐛',
      tagline: 'Quality assurance in the ChatDev testing phase.',
      about:
        'Documents the Tester role in ChatDev (arXiv 2307.07924). Runs the testing phase of the pipeline, validating software quality and communicating issues back to the Programmer. Executability score: 0.88 vs 0.36 (GPT-Engineer). Source: arXiv paper.',
      category: 'Audit & QA',
      platform: 'ChatDev',
      owner: 'gpt-engineer-org',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
    },

    // -- CrewAI agents (one slug per role) --
    {
      slug: 'crewai-researcher',
      name: 'CrewAI Researcher',
      avatar: '🔍',
      tagline: 'First stage of a sequential CrewAI research pipeline.',
      about:
        'Documents the Researcher agent in the CrewAI sequential crew pattern. Conducts research on a given topic and passes structured findings to the Analyst via the context chain. As documented: "information flows naturally between agents, just as it would in a human team." Source: CrewAI official docs.',
      category: 'Research',
      platform: 'CrewAI',
      owner: 'crewai-inc',
      seedLayer: 'curated',
      sourceUrl: 'https://docs.crewai.com/en/guides/crews/first-crew',
      sourceName: 'CrewAI Docs — First Crew',
    },
    {
      slug: 'crewai-analyst',
      name: 'CrewAI Analyst',
      avatar: '📈',
      tagline: 'Second stage of a sequential CrewAI pipeline — synthesizes research.',
      about:
        'Documents the Analyst agent in the CrewAI sequential crew pattern. Receives research findings via the context chain and synthesizes them into a comprehensive report. Waits for the Researcher to complete before starting. Context dependency is declared explicitly in the task definition. Source: CrewAI official docs.',
      category: 'Research',
      platform: 'CrewAI',
      owner: 'crewai-inc',
      seedLayer: 'curated',
      sourceUrl: 'https://docs.crewai.com/en/guides/crews/first-crew',
      sourceName: 'CrewAI Docs — First Crew',
    },

    // -- Claude Code Agent Teams (peer topology, distinct from sub-agents) --
    {
      slug: 'claude-code-teammate',
      name: 'Claude Code Teammate',
      avatar: '🤝',
      tagline: 'Peer agent in a Claude Code agent team — shared task list and mailbox.',
      about:
        'Documents the teammate role in Claude Code\'s experimental agent teams feature. Unlike sub-agents (hierarchical, one-way result), teammates share a task list and communicate via a mailbox system. "Claude Code agent teams allow multiple Claude Code instances to work together as peers on the same codebase in real time." 3–5 teammates recommended. Source: Claude Code official docs (experimental).',
      category: 'Engineering',
      platform: 'Claude Code',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://code.claude.com/docs/en/agent-teams',
      sourceName: 'Claude Code Docs — Agent Teams',
    },

    // =========================================================
    // ILLUSTRATIVE — existing fictional agents (unchanged)
    // =========================================================
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
      seedLayer: 'illustrative',
    },
    {
      slug: 'codepilot-cr-perf',
      name: 'CodePilot CR (Performance)',
      avatar: '⚡',
      tagline: 'Performance-focused lens of the CodePilot CR review system. (Fictional demo data.)',
      about: 'Fictional demo agent — the performance-review lens of the DKraft CI review team.',
      category: 'Engineering',
      platform: 'LangGraph',
      model: 'Claude Sonnet 4.6',
      owner: 'dkraft',
      lineageKind: 'instance',
      lineageOf: 'codepilot-cr',
      lineageNote: 'Performance-lens instance of the CodePilot CR blueprint. (Fictional.)',
      seedLayer: 'illustrative',
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
      seedLayer: 'illustrative',
    },
    {
      slug: 'ledgerline',
      name: 'LedgerLine',
      avatar: '🧾',
      tagline: 'Invoice reconciliation and expense categorization. (Fictional demo data.)',
      category: 'Finance Ops',
      platform: 'Custom',
      owner: 'dkraft',
      seedLayer: 'illustrative',
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
      seedLayer: 'illustrative',
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
      seedLayer: 'illustrative',
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
      seedLayer: 'illustrative',
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
      seedLayer: 'illustrative',
    },
    {
      slug: 'translate-flow',
      name: 'TranslateFlow',
      avatar: '🌐',
      tagline: 'Context-aware localization across 12 languages. (Fictional demo data.)',
      category: 'Localization',
      platform: 'LangGraph',
      owner: 'mira-systems',
      seedLayer: 'illustrative',
    },
    // -- NEW ILLUSTRATIVE agents for new configs --
    {
      slug: 'nexus-planner',
      name: 'NexusPlanner',
      avatar: '📅',
      tagline:
        'Content calendar and brief generation for the Nexus pipeline. (Fictional demo data.)',
      category: 'Content',
      platform: 'LangGraph',
      owner: 'nexus-content',
      howBuilt:
        'LangGraph state machine: brief intake → keyword research → outline generation → calendar slot assignment. (Fictional.)',
      seedLayer: 'illustrative',
    },
    {
      slug: 'nexus-writer',
      name: 'NexusWriter',
      avatar: '✍️',
      tagline: 'Long-form content drafting with brand-voice enforcement. (Fictional demo data.)',
      category: 'Content',
      platform: 'LangGraph',
      model: 'Claude Sonnet 4.6',
      owner: 'nexus-content',
      seedLayer: 'illustrative',
    },
    {
      slug: 'nexus-editor',
      name: 'NexusEditor',
      avatar: '✂️',
      tagline: 'SEO and quality editing pass for drafted content. (Fictional demo data.)',
      category: 'Content',
      platform: 'LangGraph',
      owner: 'nexus-content',
      oversight: 'Human review gate before publish. (Fictional.)',
      seedLayer: 'illustrative',
    },
    {
      slug: 'shopstream-catalog',
      name: 'CatalogAgent',
      avatar: '🏷️',
      tagline:
        'Product catalog sync, enrichment, and attribute normalization. (Fictional demo data.)',
      category: 'E-commerce Ops',
      platform: 'Custom',
      owner: 'shopstream',
      seedLayer: 'illustrative',
    },
    {
      slug: 'shopstream-pricer',
      name: 'PricerAgent',
      avatar: '💰',
      tagline:
        'Dynamic repricing based on competitor signals and margin rules. (Fictional demo data.)',
      category: 'E-commerce Ops',
      platform: 'Custom',
      owner: 'shopstream',
      oversight: 'Price changes above 15% require human approval. (Fictional.)',
      seedLayer: 'illustrative',
    },
    {
      slug: 'shopstream-ops',
      name: 'OpsAgent',
      avatar: '📦',
      tagline: 'Order routing, fulfillment triage, and returns handling. (Fictional demo data.)',
      category: 'E-commerce Ops',
      platform: 'Custom',
      owner: 'shopstream',
      seedLayer: 'illustrative',
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
      a.seedLayer ?? 'illustrative',
      a.sourceUrl ?? null,
      a.sourceName ?? null
    );
    agentIds.set(a.slug, Number(res.lastInsertRowid));
  }

  // ---- configurations (renamed from teams) ----
  const insConfig = db.prepare(
    `INSERT INTO configurations (slug, name, avatar, kind, tagline, about, topology, oversight, how_built,
       owner_id, operational_since, featured, topology_type, agent_count, platform, industries,
       task_kinds, why_it_works, seed_layer, source_url, source_name)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const configurations: SeedConfiguration[] = [
    // =========================================================
    // REAL — The Ari Collective (unchanged from v3)
    // =========================================================
    {
      slug: 'ari-collective',
      name: 'The Ari Collective',
      avatar: '🧩',
      kind: 'team',
      tagline:
        'Four-agent operating team: orchestration, engineering, operations, independent audit.',
      about:
        'A real, operating agent configuration. Topology, role boundaries, lessons, and operating dates are real [verified-from-logs/rules]. Lifetime metrics are shown as [unknown] rather than invented; the windowed reconciliation metric is derived from the task registry. Entries with approximate dates are marked illustrative.',
      topology:
        'Hub-and-spoke. Ari (hub) scopes and routes work; Stanley executes engineering; Arthur runs operations; Laplace audits independently. Acceptance flows through Laplace or the human owner — never through the agent that did the work.',
      oversight:
        'Human-on-the-loop. Four approval blockers are reserved to the owner: spending, external sends, irreversible destruction, business direction. Everything else is decide → execute → report.',
      howBuilt:
        'OpenClaw and Claude Code runtimes. File-based shared memory (files are truth; memory lies). Lesson capture in the same response as the correction. Role boundaries enforced by per-agent permissions, so failures stay traceable and recoverable.',
      owner: 'intronode',
      operationalSince: '2026-03-22',
      featured: true,
      seedLayer: 'real',
      topologyType: 'hub_and_spoke',
      agentCount: 4,
      platform: 'OpenClaw',
      industries: ['software-delivery', 'ops'],
      taskKinds: ['product-engineering', 'deploy-verification', 'independent-qa', 'ops-monitoring'],
      whyItWorks:
        'Role boundaries enforced by per-agent permissions make failures traceable. The hub-and-spoke topology keeps orchestration separate from execution. Independent audit (Laplace never QAs its own work) breaks the self-certification failure mode common in single-agent loops.',
      members: [
        ['ari', 'Orchestrator', 'Scoping, routing, exception drill-down, final synthesis'],
        ['stanley', 'Engineer', 'Implementation, refactors, build and test'],
        ['arthur', 'Operations', 'Monitoring, cron, deploy verification'],
        ['laplace', 'Auditor', 'Independent QA gates and acceptance passes'],
      ],
    },

    // =========================================================
    // CURATED — Documented public configurations
    // =========================================================

    // 1. Anthropic Orchestrator-Workers Pattern
    {
      slug: 'anthropic-orchestrator-workers',
      name: 'Anthropic Orchestrator-Workers Pattern',
      avatar: '🔀',
      kind: 'team',
      tagline: 'Central LLM dynamically breaks down tasks and delegates to specialist workers.',
      about:
        'Documents the orchestrator-workers pattern described in Anthropic\'s "Building Effective Agents" guide. A central LLM (orchestrator) dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results. Subtasks are determined by the orchestrator based on specific input — not predefined. Recommended for coding tasks that affect multiple files or require parallel execution. Source: Anthropic engineering blog.',
      topology:
        'One orchestrator LLM directs N worker LLMs. Subtasks are determined dynamically at runtime, not predefined. The orchestrator synthesizes worker results. Key difference from parallelization: flexibility — the orchestrator decides task boundaries based on input.',
      oversight:
        'Described as suitable for tasks where "it\'s difficult or impossible to predict" the required subtasks in advance. Human oversight recommended for high-stakes outputs.',
      howBuilt:
        'Implemented directly against the Claude API without a framework layer. Anthropic recommends starting with the simplest solution and adding complexity only when needed. Routing easy/common questions to smaller models (e.g. Haiku) and hard/unusual questions to more capable models (e.g. Sonnet) is documented as a cost-control technique.',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://www.anthropic.com/research/building-effective-agents',
      sourceName: 'Anthropic — Building Effective Agents',
      topologyType: 'hub_and_spoke',
      agentCount: 2,
      platform: 'Claude API',
      industries: ['software-delivery', 'research', 'data-extraction'],
      taskKinds: ['multi-file-coding', 'research-synthesis', 'dynamic-task-decomposition'],
      whyItWorks:
        'The orchestrator adapts task decomposition to the specific input rather than following a fixed pipeline, making it effective for unpredictable problem spaces. Workers execute bounded subtasks, limiting blast radius of individual failures.',
      members: [
        [
          'anthropic-orchestrator',
          'Orchestrator',
          'Dynamic task decomposition and result synthesis',
        ],
        ['anthropic-worker', 'Worker', 'Executes delegated subtasks'],
      ],
    },

    // 2. Anthropic SWE-Bench Solo Agent
    {
      slug: 'anthropic-swe-bench-agent',
      name: 'Claude SWE-Bench Configuration',
      avatar: '🏆',
      kind: 'team',
      tagline: 'Single-agent software engineer achieving 49% on SWE-bench Verified.',
      about:
        'Documents the solo-plus-tools configuration Anthropic used to achieve 49% on SWE-bench Verified, beating the previous state-of-the-art of 45%. Model: Claude 3.5 Sonnet (upgraded). Tools: Bash (persistent shell state) + str_replace_editor (file viewing and editing). Design philosophy: "give as much control as possible to the language model itself, and keep the scaffolding minimal." Source: Anthropic research page.',
      topology:
        'Single agent (solo-plus-tools). Claude 3.5 Sonnet operates two tools: a persistent Bash shell and a custom file editor. The model determines its own workflow freely — "the model is free to choose how it moves from step to step, rather than having strict and discrete transitions."',
      oversight:
        'No human-in-the-loop described for this configuration. Evaluated on the SWE-bench Verified benchmark (500 real GitHub issues).',
      howBuilt:
        'Minimal scaffolding. Two tools only: Bash (persistent state across calls) and str_replace_editor. The LLM autonomously decides when to read files, run tests, or edit code. Claude 3.5 Sonnet (upgraded version) was the model used.',
      owner: 'anthropic',
      operationalSince: '2024-10-22',
      seedLayer: 'curated',
      sourceUrl: 'https://www.anthropic.com/research/swe-bench-sonnet',
      sourceName: 'Anthropic — Claude SWE-bench Sonnet',
      topologyType: 'solo_plus_tools',
      agentCount: 1,
      platform: 'Claude API',
      industries: ['software-delivery'],
      taskKinds: ['bug-fixing', 'code-editing', 'test-execution'],
      whyItWorks:
        'Minimal scaffolding gives the model maximum flexibility to choose its own strategy. The persistent Bash shell maintains state across tool calls, allowing iterative debugging without losing context. According to the source, the upgraded model improved from 33% to 49% on the same benchmark.',
      members: [
        [
          'anthropic-swe-agent',
          'Software Engineer',
          'Autonomous code editing and bug fixing via Bash + file editor',
        ],
      ],
    },

    // 3. Claude Code Sub-agents Pattern
    {
      slug: 'claude-code-subagents',
      name: 'Claude Code Sub-agents Pattern',
      avatar: '🔱',
      kind: 'team',
      tagline: 'Lead agent spawns specialist subagents in isolated context windows.',
      about:
        "Documents the sub-agents pattern from Claude Code's official documentation. A lead Claude Code session spawns specialist subagents — each with its own context window, custom system prompt, specific tool access, and independent permissions. Best use: tasks where a side-task would flood the main conversation with content not referenced again. Source: Claude Code official docs.",
      topology:
        'Hub-and-spoke with context isolation. Lead agent coordinates and assigns work. Each subagent runs in its own context window and returns only a summary to the lead. Subagents only report results back to the main agent and cannot communicate with each other (vs. agent teams, which allow peer messaging).',
      oversight:
        'Subagents can be constrained via tool allowlists (e.g., read-only access). Lead maintains control; subagent results are summarized back to lead context.',
      howBuilt:
        'Subagent definitions use custom system prompts and tool restrictions. Cost control: routing tasks to faster/cheaper models like Haiku for subagents. Each subagent definition has a description that Claude uses to decide when to delegate. Source: code.claude.com/docs/en/sub-agents.',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://code.claude.com/docs/en/sub-agents',
      sourceName: 'Claude Code Docs — Sub-agents',
      topologyType: 'hub_and_spoke',
      agentCount: 2,
      platform: 'Claude Code',
      industries: ['software-delivery'],
      taskKinds: ['multi-file-coding', 'research', 'context-management'],
      whyItWorks:
        'Context isolation keeps the main conversation clean and prevents token waste from exploration work. Tool allowlists on subagents enforce constraints mechanically. Cost routing (cheaper model for subagents) is documented as a first-class design pattern.',
      members: [
        ['claude-code-lead', 'Lead', 'Coordinates work and synthesizes results'],
        ['claude-code-subagent', 'Subagent', 'Executes bounded task in isolated context window'],
      ],
    },

    // 4. Magentic-One
    {
      slug: 'magentic-one',
      name: 'Magentic-One',
      avatar: '🕹️',
      kind: 'team',
      tagline: 'Microsoft Research generalist 5-agent system: GAIA 32.33%, WebArena 32.8%.',
      about:
        'Documents Magentic-One, a generalist multi-agent system by Microsoft Research (arXiv 2411.04468, Nov 2024). Five agents: Orchestrator + WebSurfer + FileSurfer + Coder + ComputerTerminal. Default model: GPT-4o-2024-05-13. Achieves "statistically competitive performance to the state-of-the-art on three diverse and challenging agentic benchmarks: GAIA, AssistantBench, and WebArena." Open-source implementation available. Source: arXiv paper.',
      topology:
        'Hierarchical. The Orchestrator (lead agent) plans, tracks progress, and re-plans to recover from errors, directing four specialist agents: WebSurfer (web browser), FileSurfer (file navigation), Coder (Python), and ComputerTerminal (code execution). Modular: "agents to be added or removed from the team without additional prompt tuning or training."',
      oversight:
        'No human-in-the-loop described in the paper; evaluated on automated benchmarks. Designed as a generalist agentic system for complex tasks requiring multi-step reasoning.',
      howBuilt:
        'Built on AutoGen (Microsoft). Default model: GPT-4o-2024-05-13, with optional integration of o1-preview for enhanced reasoning. Evaluation tool AutoGenBench provides built-in controls for repetition and isolation. Open-source.',
      owner: 'microsoft-research',
      operationalSince: '2024-11-07',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2411.04468',
      sourceName: 'arXiv 2411.04468 — Magentic-One',
      topologyType: 'hierarchical',
      agentCount: 5,
      platform: 'AutoGen',
      industries: ['research', 'software-delivery', 'data-extraction'],
      taskKinds: ['web-navigation', 'file-operations', 'code-execution', 'complex-reasoning'],
      whyItWorks:
        'Specialist agents each own a specific skill (web, files, code) that the Orchestrator cannot perform directly. The Orchestrator re-plans on error rather than failing silently. Modularity allows extending the team without retraining. GAIA benchmark: 32.33% (±5.3) with GPT-4o; 38.00% (±5.5) with GPT-4o + o1-preview.',
      members: [
        ['magentic-orchestrator', 'Orchestrator', 'Plans, tracks progress, re-plans on error'],
        ['magentic-websurfer', 'WebSurfer', 'Web browser navigation'],
        ['magentic-filesurfer', 'FileSurfer', 'Local file system navigation'],
        ['magentic-coder', 'Coder', 'Python code writing'],
        ['magentic-terminal', 'ComputerTerminal', 'Code execution environment'],
      ],
    },

    // 5. MetaGPT
    {
      slug: 'metagpt-pipeline',
      name: 'MetaGPT Software Dev Pipeline',
      avatar: '🏭',
      kind: 'team',
      tagline: '5-agent SOP-encoded pipeline — 124.3 tokens/LoC, executability 3.75/4.',
      about:
        "Documents MetaGPT (arXiv 2308.00352), a five-agent software development pipeline that encodes Standardized Operating Procedures (SOPs) into prompt sequences. Agents communicate via a shared message pool (publish-subscribe). Token efficiency: 124.3 tokens per line of code vs ChatDev's 248.9. Executability score 3.75/4 vs ChatDev's 2.25 on the SoftwareDev benchmark. Source: arXiv paper.",
      topology:
        'Sequential pipeline with shared message pool. Product Manager → Architect → Project Manager → Engineer → QA Engineer. Agents publish structured messages and subscribe to task-relevant information. Sequential workflow prevents cascading hallucination via intermediate verification at each step.',
      oversight:
        'SOP verification at each pipeline stage — agents check intermediate results against structured specifications. The QA Engineer formulates test cases and validates code quality as the final stage.',
      howBuilt:
        'SOPs encoded as prompt sequences for each role. Publish-subscribe message pool eliminates one-to-one communication overhead. Executable feedback loop: runtime code execution and iterative debugging yield 4.2% and 5.4% improvements in Pass@1 on HumanEval and MBPP respectively. HumanEval: 85.9% Pass@1; MBPP: 87.7% Pass@1.',
      owner: 'gpt-engineer-org',
      operationalSince: '2023-08-01',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.00352',
      sourceName: 'arXiv 2308.00352 — MetaGPT',
      topologyType: 'pipeline',
      agentCount: 5,
      platform: 'MetaGPT',
      industries: ['software-delivery'],
      taskKinds: ['software-development', 'requirements-analysis', 'code-generation', 'qa'],
      whyItWorks:
        'SOPs give each agent a structured, verifiable output format — reducing hallucination cascades. The shared message pool is more efficient than direct dialogue. Token efficiency of 124.3 tokens/LoC (vs 248.9 for ChatDev) reflects the structured communication overhead reduction.',
      members: [
        ['metagpt-pm', 'Product Manager', 'PRD creation, user stories, business analysis'],
        ['metagpt-architect', 'Architect', 'Technical specifications and system design'],
        ['metagpt-project-manager', 'Project Manager', 'Task decomposition and assignment'],
        ['metagpt-engineer', 'Engineer', 'Code implementation'],
        ['metagpt-qa', 'QA Engineer', 'Test case formulation and validation'],
      ],
    },

    // 6. ChatDev
    {
      slug: 'chatdev-pipeline',
      name: 'ChatDev Communicative Pipeline',
      avatar: '💬',
      kind: 'team',
      tagline: '5-role sequential pipeline — 22,949 tokens, 148s per software task.',
      about:
        'Documents ChatDev (arXiv 2307.07924), a multi-agent software development framework using communicative agents. Five roles: CEO, CTO, Programmer, Reviewer, Tester. Three phases: design → coding → testing. Communication via dual-agent dialogue (instructor + assistant pairs). Avg 22,949 tokens and 148.2 seconds per software task. Wins 77% of head-to-head comparisons vs GPT-Engineer (GPT-4 evaluation). Source: arXiv paper.',
      topology:
        'Sequential pipeline (chat chain) organized as 3 phases and 5 subtasks. Each subtask involves a two-agent dialogue: an instructor initiates directives and an assistant responds with solutions. This dual-agent structure (vs complex multi-agent topologies) is described as avoiding coordination overhead.',
      oversight:
        '"Communicative dehallucination" built into the dialogue structure — the instructor role checks and redirects the assistant\'s outputs, reducing error propagation across phases.',
      howBuilt:
        'Chat chain organizes sequential phases and subtasks. Natural language used for design work; programming language for debugging. Executability: 0.88 vs 0.36 (GPT-Engineer) and 0.41 (MetaGPT). Quality score 0.3953 vs 0.1419 (GPT-Engineer) and 0.1523 (MetaGPT). Files generated per task: 4.39; lines of code: 144.3.',
      owner: 'gpt-engineer-org',
      operationalSince: '2023-07-14',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2307.07924',
      sourceName: 'arXiv 2307.07924 — ChatDev',
      topologyType: 'pipeline',
      agentCount: 5,
      platform: 'ChatDev',
      industries: ['software-delivery'],
      taskKinds: ['software-development', 'code-review', 'qa', 'design'],
      whyItWorks:
        'Dual-agent dialogue (instructor + assistant) at each subtask stage enforces review before proceeding. Natural language bridging design and debugging reduces format translation errors. Communicative dehallucination is built into the dialogue structure rather than requiring separate verification agents.',
      members: [
        ['chatdev-ceo', 'CEO', 'Requirements and project direction'],
        ['chatdev-cto', 'CTO', 'Architecture decisions'],
        ['chatdev-programmer', 'Programmer', 'Code implementation'],
        ['chatdev-reviewer', 'Reviewer', 'Code inspection'],
        ['chatdev-tester', 'Tester', 'Quality assurance and testing phase'],
      ],
    },

    // 7. CrewAI Sequential Research Crew
    {
      slug: 'crewai-research-crew',
      name: 'CrewAI Sequential Research Crew',
      avatar: '🚢',
      kind: 'team',
      tagline: 'Researcher → Analyst sequential pipeline with natural context handoff.',
      about:
        "Documents the sequential crew pattern from CrewAI's official documentation. Two roles: Researcher (information gathering) and Analyst (synthesis and reporting). Context flows naturally from Researcher to Analyst via the context chain. The Analyst task includes context=[research_task] so findings pass automatically. Documented framework: Flows (state management + event-driven execution) coordinate higher-level orchestration; Crews handle specific complex tasks within Flows. Source: CrewAI official docs.",
      topology:
        'Sequential pipeline. Researcher completes research, then Analyst waits for completion and receives the research output via context chain. Higher-level Flow manages state and decides what to do next, delegating complex subtasks to Crews.',
      oversight:
        'Event-driven execution with state persistence: "Persist data across steps and executions." Flows manage the state and re-routing decisions.',
      howBuilt:
        'CrewAI framework. Agents defined with specialized goals and tools. Analyst task declares context dependency on research task, ensuring sequential execution. Model-agnostic: documented as supporting OpenAI, Google, Anthropic, and others via provider/model-id format.',
      owner: 'crewai-inc',
      seedLayer: 'curated',
      sourceUrl: 'https://docs.crewai.com/en/guides/crews/first-crew',
      sourceName: 'CrewAI Docs — First Crew',
      topologyType: 'pipeline',
      agentCount: 2,
      platform: 'CrewAI',
      industries: ['research', 'content'],
      taskKinds: ['research', 'report-writing', 'analysis'],
      whyItWorks:
        'Context chain ensures the Analyst receives fully-formed research without re-prompting. Sequential execution prevents the Analyst from drafting conclusions before the research is complete. State persistence via Flows allows multi-step pipelines to survive interruptions.',
      members: [
        ['crewai-researcher', 'Researcher', 'Research on topic with structured output'],
        ['crewai-analyst', 'Analyst', 'Synthesizes research into comprehensive report'],
      ],
    },

    // 8. Claude Code Agent Teams (peer topology — distinct from sub-agents)
    {
      slug: 'claude-code-agent-teams',
      name: 'Claude Code Agent Teams (Experimental)',
      avatar: '👥',
      kind: 'team',
      tagline: 'Peer teammates sharing a task list — parallel exploration on a single codebase.',
      about:
        'Documents the experimental agent teams feature in Claude Code. Unlike sub-agents (hierarchical, one-way), teammates are peers sharing a task list and communicating via a mailbox. "Claude Code agent teams allow multiple Claude Code instances to work together as peers on the same codebase in real time." Recommended size: 3–5 teammates. Feature marked experimental at time of documentation. Source: Claude Code official docs.',
      topology:
        'Peer topology with shared state. Teammates access a shared task list and communicate via a mailbox system. Parallel exploration: teammates can work on different parts of a problem simultaneously. Key distinction from sub-agents: "sub-agents only report results back to the main agent, while in agent teams agents can communicate with each other."',
      oversight:
        'Experimental feature — behavior may change. No human-in-the-loop described in documentation. 3–5 teammates recommended for optimal coordination.',
      howBuilt:
        'Claude Code runtime with shared task list and mailbox infrastructure. Agents coordinate via message passing; each agent can spawn its own sub-agents if needed. Documented as complementary to (not a replacement for) the sub-agents pattern.',
      owner: 'anthropic',
      seedLayer: 'curated',
      sourceUrl: 'https://code.claude.com/docs/en/agent-teams',
      sourceName: 'Claude Code Docs — Agent Teams',
      topologyType: 'peer',
      agentCount: 3,
      platform: 'Claude Code',
      industries: ['software-delivery'],
      taskKinds: ['parallel-exploration', 'multi-file-coding', 'distributed-debugging'],
      whyItWorks:
        'Peer topology enables parallel exploration without bottlenecking through a single orchestrator. Shared task list prevents work duplication. Mailbox communication allows agents to coordinate asynchronously. Complementary to sub-agents: teams for peer collaboration, sub-agents for context isolation.',
      members: [
        ['claude-code-teammate', 'Teammate A', 'Parallel exploration and task execution'],
        ['claude-code-lead', 'Teammate B', 'Parallel exploration and task execution'],
        ['claude-code-subagent', 'Teammate C', 'Parallel exploration and task execution'],
      ],
    },

    // =========================================================
    // ILLUSTRATIVE — existing fictional configurations (unchanged)
    // =========================================================
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
      seedLayer: 'illustrative',
      topologyType: 'pipeline',
      agentCount: 2,
      platform: 'CrewAI',
      industries: ['customer-support', 'e-commerce'],
      taskKinds: ['tier-1-resolution', 'localization'],
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
      seedLayer: 'illustrative',
      topologyType: 'peer',
      agentCount: 3,
      platform: 'Custom',
      industries: ['data-extraction', 'research'],
      taskKinds: ['structured-extraction', 'schema-validation'],
      members: [
        ['helios-extractor', 'Blueprint origin', 'Source configuration for all workers'],
        ['helios-extractor-eu', 'Worker', 'EU region instance'],
        ['helios-extractor-us', 'Worker', 'US region instance'],
      ],
    },

    // -- NEW ILLUSTRATIVE configurations --
    {
      slug: 'nexus-content-pipeline',
      name: 'Nexus Content Pipeline',
      avatar: '📰',
      kind: 'team',
      tagline:
        'Plan → Write → Edit content pipeline with brand-voice enforcement. (Fictional demo data.)',
      topology:
        'Sequential pipeline: NexusPlanner generates content briefs and calendar assignments; NexusWriter drafts long-form content; NexusEditor runs SEO and quality passes before a human publish gate. (Fictional.)',
      oversight:
        'Human review gate before publish. Content changes to brand guidelines require owner approval. (Fictional.)',
      howBuilt:
        'LangGraph state machine: brief intake → draft → edit → human review → publish. Brand-voice rules encoded in the writer system prompt. (Fictional.)',
      owner: 'nexus-content',
      seedLayer: 'illustrative',
      topologyType: 'pipeline',
      agentCount: 3,
      platform: 'LangGraph',
      industries: ['content', 'media'],
      taskKinds: ['content-planning', 'long-form-writing', 'seo-editing'],
      whyItWorks:
        'Sequential phase separation prevents an editor from running on an incomplete draft. Brand-voice rules in the writer prompt reduce editorial rework. The human gate before publish prevents automated errors from reaching readers. (Fictional.)',
      members: [
        ['nexus-planner', 'Planner', 'Brief generation and calendar assignment'],
        ['nexus-writer', 'Writer', 'Long-form draft with brand voice'],
        ['nexus-editor', 'Editor', 'SEO and quality pass'],
      ],
    },
    {
      slug: 'shopstream-ops-collective',
      name: 'ShopStream Ops Collective',
      avatar: '🛒',
      kind: 'team',
      tagline:
        'E-commerce ops trio: catalog sync, dynamic repricing, order triage. (Fictional demo data.)',
      topology:
        'Peer specialist pool with a shared ops ledger. CatalogAgent, PricerAgent, and OpsAgent each own their domain; the shared ledger triggers cross-agent events (e.g. a catalog update triggers a repricing run). (Fictional.)',
      oversight:
        'Price changes above 15% require human approval. Catalog changes trigger a 24-hour review window before going live. (Fictional.)',
      howBuilt:
        'Custom event-driven architecture. Agents subscribe to domain-specific event streams. Repricing engine uses competitor signal feeds and margin rules as inputs. (Fictional.)',
      owner: 'shopstream',
      seedLayer: 'illustrative',
      topologyType: 'peer',
      agentCount: 3,
      platform: 'Custom',
      industries: ['e-commerce'],
      taskKinds: ['catalog-management', 'dynamic-repricing', 'order-routing', 'returns'],
      whyItWorks:
        "Domain ownership prevents agents from stepping on each other's data. Shared event ledger enables cross-agent coordination without tight coupling. Human approval gate on large price changes preserves margin control. (Fictional.)",
      members: [
        ['shopstream-catalog', 'Catalog', 'Product sync, enrichment, normalization'],
        ['shopstream-pricer', 'Pricer', 'Dynamic repricing from competitor signals'],
        ['shopstream-ops', 'Ops', 'Order routing, fulfillment, returns'],
      ],
    },
    {
      slug: 'dkraft-ci-reviewer',
      name: 'DKraft CI Review Team',
      avatar: '🔬',
      kind: 'team',
      tagline:
        'Three-lens parallel PR review: security, performance, test coverage. (Fictional demo data.)',
      topology:
        'Peer parallel review with synthesis. Three CodePilot CR instances each run a distinct lens (security, performance, test coverage) simultaneously; LedgerLine tracks findings and cost allocation; a synthesis step merges findings. (Fictional.)',
      oversight: 'Findings above severity HIGH require human sign-off before merge. (Fictional.)',
      howBuilt:
        'LangGraph fan-out: PR diff dispatched to three parallel reviewers; findings collected into structured JSON; synthesis model merges and deduplicates. (Fictional.)',
      owner: 'dkraft',
      seedLayer: 'illustrative',
      topologyType: 'peer',
      agentCount: 3,
      platform: 'LangGraph',
      industries: ['software-delivery'],
      taskKinds: ['code-review', 'security-audit', 'performance-analysis', 'test-coverage'],
      whyItWorks:
        "Parallel lens separation prevents a single reviewer from gravitating to one issue type. Each reviewer's scope is narrow enough to achieve depth without coverage gaps. Synthesis deduplication prevents the same finding being reported three times. (Fictional.)",
      members: [
        ['codepilot-cr', 'Security Reviewer', 'Security implications and vulnerability patterns'],
        ['codepilot-cr-perf', 'Performance Reviewer', 'Performance impact and hot paths'],
        ['ledgerline', 'Findings Tracker', 'Cost and findings ledger'],
      ],
    },
  ];
  const insMember = db.prepare(
    'INSERT INTO configuration_members (configuration_id, agent_id, role, role_detail, ordinal) VALUES (?,?,?,?,?)'
  );
  for (const c of configurations) {
    const ownerId = ownerIds.get(c.owner);
    if (ownerId === undefined) throw new Error(`seed: unknown owner ${c.owner}`);
    const res = insConfig.run(
      c.slug,
      c.name,
      c.avatar,
      c.kind,
      c.tagline,
      c.about ?? null,
      c.topology ?? null,
      c.oversight ?? null,
      c.howBuilt ?? null,
      ownerId,
      c.operationalSince ?? null,
      c.featured ? 1 : 0,
      c.topologyType ?? null,
      c.agentCount ?? null,
      c.platform ?? null,
      c.industries ? JSON.stringify(c.industries) : null,
      c.taskKinds ? JSON.stringify(c.taskKinds) : null,
      c.whyItWorks ?? null,
      c.seedLayer ?? 'illustrative',
      c.sourceUrl ?? null,
      c.sourceName ?? null
    );
    const configId = Number(res.lastInsertRowid);
    configIds.set(c.slug, configId);
    c.members.forEach(([slug, role, detail], i) => {
      insMember.run(configId, subjectId(['agent', slug]), role, detail, i);
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
      subject: ['configuration', 'ari-collective'],
      date: '2026-06-08',
      type: 'milestone',
      title: 'Shipped AgentCV v2 (Sprints 1–5)',
      body: 'Registration, discovery, profiles, verification badges, consulting-request flow — built and deployed across five sprints. Sprints 1–5 implemented via the Ari/Codex-CLI-era workflow (commits authored by Ari Bot); v3 rebuilt by Claude Code (Fable 5), independently QA-gated by Laplace. [verified-from-git-log]',
      evidenceUrl: REPO,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'ari-collective'],
      date: '2026-06-09',
      type: 'incident',
      title: 'Vercel CI builds broken by husky prepare script',
      body: 'Lesson: CI environments differ from local — every "works locally, fails CI" failure has the same root. Fixed with `husky || true` in the prepare script. Entry date approximate to within a few days.',
      evidenceUrl: `${REPO}/commit/c70e14a`,
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'ari-collective'],
      date: '2026-04-02',
      type: 'lesson',
      title: 'Supabase SSR cookies vs browser-client localStorage',
      body: 'Client-side table queries hit RLS as anonymous even when SSR is authenticated. Route authenticated DB queries through server-side endpoints. Date approximate; lesson real and recurring.',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['configuration', 'ari-collective'],
      date: '2026-05-20',
      type: 'lesson',
      title: 'Measure multi-byte files in chars (wc -m), not bytes (wc -c)',
      body: 'Korean/Japanese/Chinese text inflates byte counts ~3× vs char counts; comparing bytes against char caps produces false truncation alarms. Recurred twice before becoming a rule. Date approximate; lesson real.',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['configuration', 'ari-collective'],
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

    // -- CURATED configuration proof entries (evidence_linked to source URLs) --
    {
      subject: ['configuration', 'anthropic-orchestrator-workers'],
      date: '2025-01-01',
      type: 'artifact',
      title: 'Anthropic "Building Effective Agents" engineering guide published',
      body: 'Describes orchestrator-workers as one of five patterns for building effective agents. Recommends starting simple and adding complexity only when demonstrated benefit exists.',
      evidenceUrl: 'https://www.anthropic.com/research/building-effective-agents',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'anthropic-swe-bench-agent'],
      date: '2024-10-22',
      type: 'milestone',
      title: 'Claude 3.5 Sonnet achieves 49% on SWE-bench Verified',
      body: 'Beats previous SOTA of 45%. Prior Claude 3.5 Sonnet scored 33%; Claude 3 Opus 22%. Two tools only: Bash + str_replace_editor. Source: Anthropic research page.',
      evidenceUrl: 'https://www.anthropic.com/research/swe-bench-sonnet',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'claude-code-subagents'],
      date: '2025-06-01',
      type: 'artifact',
      title: 'Claude Code sub-agents documentation published',
      body: 'Official documentation describes subagent patterns, context isolation, tool allowlists, and cost routing to cheaper models.',
      evidenceUrl: 'https://code.claude.com/docs/en/sub-agents',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'claude-code-agent-teams'],
      date: '2025-06-01',
      type: 'artifact',
      title: 'Claude Code Agent Teams documentation published (experimental)',
      body: 'Peer topology with shared task list and mailbox. Recommended size: 3–5 teammates. Distinct from sub-agents: teammates communicate with each other; sub-agents only report back to the lead.',
      evidenceUrl: 'https://code.claude.com/docs/en/agent-teams',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'magentic-one'],
      date: '2024-11-07',
      type: 'artifact',
      title: 'Magentic-One paper published (arXiv 2411.04468)',
      body: 'Five-agent system achieves GAIA 32.33% (±5.3), WebArena 32.8% (±3.2), AssistantBench 25.3% accuracy (±6.3) with GPT-4o. With o1-preview: GAIA 38.00% (±5.5).',
      evidenceUrl: 'https://arxiv.org/abs/2411.04468',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'metagpt-pipeline'],
      date: '2023-08-01',
      type: 'artifact',
      title: 'MetaGPT paper published (arXiv 2308.00352)',
      body: "Five-agent SOP pipeline. HumanEval: 85.9% Pass@1; MBPP: 87.7% Pass@1. Token efficiency: 124.3 tokens/LoC vs ChatDev's 248.9. Executability: 3.75/4 vs ChatDev's 2.25.",
      evidenceUrl: 'https://arxiv.org/abs/2308.00352',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'chatdev-pipeline'],
      date: '2023-07-14',
      type: 'artifact',
      title: 'ChatDev paper published (arXiv 2307.07924)',
      body: 'Five-role sequential pipeline. Avg 22,949 tokens and 148.2 seconds per software task. Executability 0.88 vs 0.36 (GPT-Engineer). Wins 77% of comparisons vs GPT-Engineer (GPT-4 evaluation).',
      evidenceUrl: 'https://arxiv.org/abs/2307.07924',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'crewai-research-crew'],
      date: '2024-01-01',
      type: 'artifact',
      title: 'CrewAI sequential crew pattern documented in official docs',
      body: 'Researcher + Analyst sequential pipeline with context chain. Supports multiple LLM providers. Flows enable state-managed, event-driven higher-level orchestration.',
      evidenceUrl: 'https://docs.crewai.com/en/guides/crews/first-crew',
      provenance: 'evidence_linked',
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
    // -- Fictional configurations --
    {
      subject: ['configuration', 'mira-support-desk'],
      date: '2026-05-29',
      type: 'task',
      title: 'Bilingual launch for EU customer',
      evidenceUrl: 'https://example.com/mira/eu-launch',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'mira-support-desk'],
      date: '2026-05-02',
      type: 'milestone',
      title: 'Sub-2-minute median first response, 60 days',
      evidenceUrl: 'https://example.com/mira/frt',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'mira-support-desk'],
      date: '2026-04-11',
      type: 'incident',
      title: 'Escalation queue overflow during outage spike',
      body: 'Added back-pressure rule: pause auto-resolution above threshold.',
      evidenceUrl: 'https://example.com/mira/postmortem-apr',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'helios-swarm'],
      date: '2026-05-20',
      type: 'task',
      title: 'Scaled to 2 regional workers from one blueprint',
      provenance: 'self_reported',
      illustrative: true,
    },
    // -- new illustrative config proofs --
    {
      subject: ['configuration', 'nexus-content-pipeline'],
      date: '2026-05-10',
      type: 'milestone',
      title: '500 articles published through the pipeline',
      evidenceUrl: 'https://example.com/nexus/milestone-500',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'nexus-content-pipeline'],
      date: '2026-04-20',
      type: 'incident',
      title: 'Brand-voice drift detected after writer system prompt update',
      body: 'Rolled back system prompt; added brand-voice regression test to editor stage. (Fictional.)',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['configuration', 'shopstream-ops-collective'],
      date: '2026-05-15',
      type: 'task',
      title: 'Spring sale: 12,400 orders routed across 3 fulfillment centers',
      evidenceUrl: 'https://example.com/shopstream/spring-sale',
      provenance: 'evidence_linked',
      illustrative: true,
    },
    {
      subject: ['configuration', 'shopstream-ops-collective'],
      date: '2026-04-01',
      type: 'lesson',
      title: 'Repricing agent triggered margin breach on a clearance category',
      body: 'Added category exclusion list to pricing rules; clearance items now excluded from dynamic repricing. (Fictional.)',
      provenance: 'self_reported',
      illustrative: true,
    },
    {
      subject: ['configuration', 'dkraft-ci-reviewer'],
      date: '2026-05-25',
      type: 'milestone',
      title: '1,000 PRs reviewed with zero missed HIGH-severity findings',
      evidenceUrl: 'https://example.com/dkraft/ci-1000',
      provenance: 'evidence_linked',
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
      subject: ['configuration', 'ari-collective'],
      key: 'window_reconciliation_pct',
      label: 'Windowed reconciliation',
      value: 90.8,
      unit: 'pct',
      asOf: '2026-06-11',
      note: '394 of 434 tasks terminal-reconciled in the current registry window (since 2026-05-30); 719 logged completion events pending dedupe. [derived-from-registry, window-scoped]',
      illustrative: false,
    },
    {
      subject: ['configuration', 'ari-collective'],
      key: 'tasks_completed',
      label: 'Lifetime tasks',
      value: null,
      unit: 'count',
      asOf: '2026-06-11',
      note: 'Lifetime total not reconciled end-to-end; deliberately not estimated.',
      illustrative: false,
    },
    {
      subject: ['configuration', 'ari-collective'],
      key: 'success_rate',
      label: 'Lifetime success rate',
      value: null,
      unit: 'pct',
      asOf: '2026-06-11',
      note: 'Unknown pending full-history reconciliation; the windowed metric above is the honest current figure.',
      illustrative: false,
    },
    {
      subject: ['configuration', 'ari-collective'],
      key: 'cost_per_task_usd',
      label: 'Cost per task',
      value: null,
      unit: 'usd',
      asOf: '2026-06-11',
      note: 'Not tracked per-task across runtimes; deliberately not estimated.',
      illustrative: false,
    },

    // -- CURATED metrics (evidence_linked; only what the source states) --
    {
      subject: ['configuration', 'anthropic-swe-bench-agent'],
      key: 'success_rate',
      label: 'SWE-bench Verified score',
      value: 49,
      unit: 'pct',
      asOf: '2024-10-22',
      note: 'Score on SWE-bench Verified (500 GitHub issues). Previous SOTA: 45%. Source: https://www.anthropic.com/research/swe-bench-sonnet [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'magentic-one'],
      key: 'gaia_score',
      label: 'GAIA benchmark score',
      value: 32.33,
      unit: 'pct',
      asOf: '2024-11-07',
      note: '±5.3 confidence interval; default GPT-4o-2024-05-13 configuration. Source: arXiv 2411.04468 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'magentic-one'],
      key: 'webarena_score',
      label: 'WebArena score',
      value: 32.8,
      unit: 'pct',
      asOf: '2024-11-07',
      note: '±3.2 confidence interval; default GPT-4o configuration. Source: arXiv 2411.04468 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'metagpt-pipeline'],
      key: 'tokens_per_loc',
      label: 'Tokens per line of code',
      value: 124.3,
      unit: 'count',
      asOf: '2023-08-01',
      note: 'SoftwareDev benchmark; vs ChatDev 248.9. Source: arXiv 2308.00352 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'metagpt-pipeline'],
      key: 'success_rate',
      label: 'HumanEval Pass@1',
      value: 85.9,
      unit: 'pct',
      asOf: '2023-08-01',
      note: 'With executable feedback loop. MBPP: 87.7% Pass@1. Source: arXiv 2308.00352 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'chatdev-pipeline'],
      key: 'avg_response_ms',
      label: 'Avg task duration',
      value: 148200,
      unit: 'ms',
      asOf: '2023-07-14',
      note: '148.2 seconds average per software development task. Source: arXiv 2307.07924 Table 3 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'chatdev-pipeline'],
      key: 'tasks_completed',
      label: 'Avg tokens per task',
      value: 22949,
      unit: 'count',
      asOf: '2023-07-14',
      note: 'Average token usage per software task (Table 3). Files generated: 4.39; lines of code: 144.3. Source: arXiv 2307.07924 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // -- Illustrative metrics (all invented; clearly flagged) --
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
    m(['configuration', 'mira-support-desk'], 'tasks_completed', 'Tickets handled', 23800, 'count'),
    m(['configuration', 'mira-support-desk'], 'success_rate', 'Resolution rate', 91.3, 'pct'),
    m(['configuration', 'helios-swarm'], 'tasks_completed', 'Records extracted', 2140000, 'count'),
    m(['configuration', 'helios-swarm'], 'cost_per_task_usd', 'Cost per 1k records', 0.31, 'usd'),
    m(
      ['configuration', 'nexus-content-pipeline'],
      'tasks_completed',
      'Articles published',
      512,
      'count'
    ),
    m(
      ['configuration', 'nexus-content-pipeline'],
      'success_rate',
      'Human approval rate',
      94.2,
      'pct'
    ),
    m(
      ['configuration', 'shopstream-ops-collective'],
      'tasks_completed',
      'Orders processed',
      48600,
      'count'
    ),
    m(
      ['configuration', 'shopstream-ops-collective'],
      'cost_per_task_usd',
      'Cost per 100 orders',
      0.18,
      'usd'
    ),
    m(['configuration', 'dkraft-ci-reviewer'], 'tasks_completed', 'PRs reviewed', 1240, 'count'),
    m(
      ['configuration', 'dkraft-ci-reviewer'],
      'success_rate',
      'Finding acceptance rate',
      89.4,
      'pct'
    ),
  ];
  for (const x of metrics) {
    insMetric.run(
      x.subject[0],
      subjectId(x.subject),
      x.key,
      x.label,
      x.value,
      x.unit,
      x.provenance ?? 'self_reported',
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
    // curated agent capabilities (source-grounded where stated)
    ['anthropic-swe-agent', 'Autonomous bug fixing', 90],
    ['anthropic-swe-agent', 'Multi-file code editing', 88],
    ['magentic-orchestrator', 'Task planning & re-planning', 85],
    ['magentic-websurfer', 'Web navigation', 82],
    ['metagpt-pm', 'Requirements analysis', 84],
    ['metagpt-engineer', 'Code generation', 87],
    ['chatdev-programmer', 'Communicative coding', 83],
    ['chatdev-reviewer', 'Code inspection', 80],
    ['crewai-researcher', 'Structured research', 82],
    ['crewai-analyst', 'Research synthesis', 80],
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
    'configuration',
    subjectId(['configuration', 'mira-support-desk']),
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
