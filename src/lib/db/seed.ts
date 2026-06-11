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
      "Independent agent-operations studio. We run the Ari Collective — a four-agent team covering orchestration, engineering, operations, and independent audit — and publish its windowed metrics with [unknown] where we haven't reconciled the data. What we publish is what we can stand behind.",
      null,
    ],
    [
      'mira-systems',
      'Mira Systems',
      'org',
      'Support-automation studio.',
      'https://example.com/mira',
    ],
    ['dkraft', 'Dana Kraft', 'individual', 'Indie agent builder.', 'https://example.com/dkraft'],
    [
      'helios-labs',
      'Helios Labs',
      'org',
      'Data-extraction swarm operators.',
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
    // --- CURATED additional org owners ---
    [
      'camel-ai',
      'CAMEL-AI (King Abdullah University of Science and Technology)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group that introduced the CAMEL role-playing multi-agent framework (NeurIPS 2023).',
      'https://github.com/camel-ai/camel',
    ],
    [
      'stanford-nlp',
      'Stanford NLP Group',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group that published Generative Agents (arXiv 2304.03442), the Smallville interactive sandbox.',
      'https://nlp.stanford.edu',
    ],
    [
      'princeton-nlp',
      'Princeton NLP / SWE-bench authors',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group behind SWE-agent and the SWE-bench evaluation benchmark.',
      'https://github.com/princeton-nlp',
    ],
    [
      'nvidia-voyager',
      'NVIDIA Research (Voyager)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group that published Voyager (arXiv 2305.16291), the open-ended LLM agent for Minecraft.',
      'https://arxiv.org/abs/2305.16291',
    ],
    [
      'aider-ai',
      'Aider (Paul Gauthier)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Open-source AI pair programming tool; introduced architect/editor two-role mode in 2024.',
      'https://aider.chat',
    ],
    [
      'all-hands-ai',
      'All Hands AI (OpenHands)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Makers of OpenHands (formerly OpenDevin), an open-source platform for generalist AI software developers; ICLR 2025.',
      'https://github.com/All-Hands-AI/OpenHands',
    ],
    [
      'huggingface',
      'Hugging Face',
      'org',
      'Profile curated from public sources; not claimed by the organization. Makers of smolagents, a minimal Python library for building AI agents.',
      'https://huggingface.co',
    ],
    [
      'openai',
      'OpenAI',
      'org',
      'Profile curated from public sources; not claimed by the organization. Maker of the Swarm educational framework (now deprecated; superseded by OpenAI Agents SDK).',
      'https://openai.com',
    ],
    [
      'microsoft-research-autogen',
      'Microsoft Research (AutoGen)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group behind AutoGen, a flexible multi-agent conversation framework (arXiv 2308.08155).',
      'https://www.microsoft.com/en-us/research',
    ],
    [
      'tencent-ai',
      'Tencent AI Lab / OpenBMB (AgentVerse)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research groups that published AgentVerse (arXiv 2308.10848), a multi-agent collaboration framework.',
      'https://arxiv.org/abs/2308.10848',
    ],
    [
      'malbo-research',
      'University of Milano-Bicocca (MALBO)',
      'org',
      'Profile curated from public sources; not claimed by the organization. Research group behind MALBO — multi-objective Bayesian optimization for LLM-based multi-agent teams (arXiv 2511.11788).',
      'https://arxiv.org/abs/2511.11788',
    ],
    // --- ILLUSTRATIVE additional owners ---
    [
      'nexus-content',
      'Nexus Content Co.',
      'org',
      'Content-pipeline studio.',
      'https://example.com/nexus',
    ],
    [
      'shopstream',
      'ShopStream',
      'org',
      'E-commerce operations collective.',
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

    // -- CAMEL agents (AI User + AI Assistant) --
    {
      slug: 'camel-ai-user',
      name: 'CAMEL AI User',
      avatar: '🧑‍💼',
      tagline: 'Role-playing task assigner in the CAMEL two-agent cooperative framework.',
      about:
        'Documents the AI User role in CAMEL (arXiv 2303.17760, NeurIPS 2023). The AI User gives instructions to the AI Assistant and drives the conversation toward a defined goal. The "inception prompting" technique assigns roles and goals to both agents, enabling autonomous cooperation without human guidance. Source: arXiv paper.',
      category: 'Orchestration',
      platform: 'CAMEL',
      owner: 'camel-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2303.17760',
      sourceName: 'arXiv 2303.17760 — CAMEL',
    },
    {
      slug: 'camel-ai-assistant',
      name: 'CAMEL AI Assistant',
      avatar: '🤖',
      tagline: 'Role-playing task executor responding to AI User instructions in CAMEL.',
      about:
        'Documents the AI Assistant role in CAMEL (arXiv 2303.17760, NeurIPS 2023). Receives instructions from the AI User and executes steps toward the shared goal. Communication is turn-by-turn natural language. The framework supports role-playing scenarios across coding, math, and general reasoning tasks. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'CAMEL',
      owner: 'camel-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2303.17760',
      sourceName: 'arXiv 2303.17760 — CAMEL',
    },

    // -- Generative Agents --
    {
      slug: 'generative-agent-npc',
      name: 'Generative Agent (Smallville)',
      avatar: '🏘️',
      tagline: 'Autonomous NPC with memory stream, reflection, and planning — 25-agent sandbox.',
      about:
        "Documents a single generative agent from the Smallville sandbox (arXiv 2304.03442, Stanford / Google Research). Each agent maintains a memory stream (stream of observations), produces higher-level reflections via synthesis, and plans behavior around those reflections. 25 agents populated the sandbox; they autonomously organized a Valentine's Day party over two in-game days. Ablation showed observation + planning + reflection are each individually necessary for believable behavior. Source: arXiv paper.",
      category: 'Research',
      platform: 'Custom (The Sims-inspired sandbox)',
      owner: 'stanford-nlp',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2304.03442',
      sourceName: 'arXiv 2304.03442 — Generative Agents',
    },

    // -- SWE-agent --
    {
      slug: 'swe-agent',
      name: 'SWE-agent',
      avatar: '🐛',
      tagline: 'Software engineering agent with ACI — 12.5% SWE-bench, 87.7% HumanEvalFix.',
      about:
        'Documents SWE-agent (arXiv 2405.15793, Princeton NLP). A single LM agent equipped with a custom Agent-Computer Interface (ACI) designed specifically for software development tasks. The ACI provides file viewing, editing, and search commands optimized for LM interaction. Benchmark results: 12.5% pass@1 on SWE-bench (unassisted); 87.7% on HumanEvalFix. Key finding: ACI design significantly impacts agent performance. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'Custom ACI',
      owner: 'princeton-nlp',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2405.15793',
      sourceName: 'arXiv 2405.15793 — SWE-agent',
    },

    // -- Voyager --
    {
      slug: 'voyager-agent',
      name: 'Voyager',
      avatar: '⛏️',
      tagline: 'Open-ended Minecraft agent — 3.3x items, 15.3x faster tech tree vs prior SOTA.',
      about:
        'Documents Voyager (arXiv 2305.16291, NVIDIA). An open-ended embodied agent using GPT-4 that continuously explores Minecraft. Three components: automatic curriculum (proposes tasks), skill library (stores reusable programs), iterative prompting (refines code execution). Benchmark: 3.3× more unique items, 2.3× longer distances, 15.3× faster tech tree milestones vs prior state-of-the-art (DEPS). Requires no fine-tuning. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'GPT-4 API (Minecraft environment)',
      model: 'GPT-4',
      owner: 'nvidia-voyager',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2305.16291',
      sourceName: 'arXiv 2305.16291 — Voyager',
    },

    // -- Aider architect/editor --
    {
      slug: 'aider-architect',
      name: 'Aider Architect',
      avatar: '📐',
      tagline: 'High-reasoning model that plans code changes in the Aider two-role pipeline.',
      about:
        "Documents the Architect role in Aider's architect/editor mode (aider.chat, 2024-09-26). The Architect uses a capable reasoning model (e.g. o1-preview) to think through what changes to make, then passes instructions to the Editor. Key insight: separating reasoning from edit-format compliance allows using a stronger model for planning and a faster model for formatting. Benchmark: o1-preview (architect) + o1-mini (editor) = 85.0% on SWE-bench. Source: Aider blog.",
      category: 'Engineering',
      platform: 'Aider',
      model: 'o1-preview',
      owner: 'aider-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://aider.chat/2024/09/26/architect.html',
      sourceName: 'Aider blog — Architect/Editor Mode',
    },
    {
      slug: 'aider-editor',
      name: 'Aider Editor',
      avatar: '✏️',
      tagline: 'Edit-format specialist that applies code changes in the Aider two-role pipeline.',
      about:
        "Documents the Editor role in Aider's architect/editor mode (aider.chat, 2024-09-26). Receives precise edit instructions from the Architect and applies them in the correct edit format (diff, whole-file, etc). A smaller/faster model (e.g. o1-mini, DeepSeek) is effective in this role because the reasoning challenge is already handled by the Architect. Benchmark: Claude 3.5 Sonnet as both architect and editor = 80.5%; Claude 3.5 Sonnet (architect) + itself (editor) tested. Source: Aider blog.",
      category: 'Engineering',
      platform: 'Aider',
      model: 'o1-mini',
      owner: 'aider-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://aider.chat/2024/09/26/architect.html',
      sourceName: 'Aider blog — Architect/Editor Mode',
    },

    // -- OpenHands --
    {
      slug: 'openhands-agent',
      name: 'OpenHands Agent',
      avatar: '🙌',
      tagline: 'Generalist AI software developer operating in a sandboxed execution environment.',
      about:
        'Documents the primary agent in OpenHands (arXiv 2407.16741, accepted ICLR 2025; formerly OpenDevin). A generalist agent that interacts with a sandboxed environment using tools for file editing, web browsing, and code execution. Open-source, 188+ contributors. The platform supports multiple runtimes: local Docker, cloud, and modal. Evaluated on SWE-Bench and WebArena task suites. Source: arXiv paper (ICLR 2025 accepted).',
      category: 'Engineering',
      platform: 'OpenHands',
      owner: 'all-hands-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2407.16741',
      sourceName: 'arXiv 2407.16741 — OpenHands',
    },

    // -- smolagents --
    {
      slug: 'smolagents-code-agent',
      name: 'smolagents CodeAgent',
      avatar: '🐍',
      tagline: 'Python-writing agent using code actions — minimal library, multi-provider support.',
      about:
        'Documents the CodeAgent in smolagents (Hugging Face). CodeAgent writes Python snippets as actions (vs JSON tool-calling). Core library: ~1000 lines. Supports any model provider: HuggingFace Inference, OpenAI, Anthropic, LiteLLM, Transformers, Ollama. Integrates with MCP servers and LangChain tools. Multi-agent orchestration supported via tutorials: one CodeAgent can call sub-agents as tools. Source: Hugging Face smolagents documentation.',
      category: 'Engineering',
      platform: 'smolagents (Python)',
      owner: 'huggingface',
      seedLayer: 'curated',
      sourceUrl: 'https://huggingface.co/docs/smolagents/en/index',
      sourceName: 'Hugging Face — smolagents docs',
    },

    // -- OpenAI Swarm --
    {
      slug: 'swarm-triage-agent',
      name: 'Swarm Triage Agent',
      avatar: '🔀',
      tagline: 'Stateless routing agent that hands off to specialists in OpenAI Swarm.',
      about:
        'Documents the triage/routing agent role in OpenAI Swarm (github.com/openai/swarm). Swarm is an educational (now deprecated; superseded by OpenAI Agents SDK) framework for multi-agent orchestration built on the Chat Completions API. The core primitive is the "handoff" — an agent can transfer control to another agent mid-conversation. Triage agents receive requests and route to specialist agents based on intent. Client-side stateless: state lives in the messages array. Source: OpenAI Swarm GitHub.',
      category: 'Orchestration',
      platform: 'OpenAI Swarm (deprecated)',
      owner: 'openai',
      seedLayer: 'curated',
      sourceUrl: 'https://github.com/openai/swarm',
      sourceName: 'OpenAI Swarm GitHub',
    },
    {
      slug: 'swarm-specialist-agent',
      name: 'Swarm Specialist Agent',
      avatar: '🎯',
      tagline: 'Domain specialist receiving handoffs from the triage agent in OpenAI Swarm.',
      about:
        'Documents the specialist agent role in OpenAI Swarm (github.com/openai/swarm). Specialists receive control via handoff from the triage agent and handle requests within their domain (e.g. billing, support, technical). Can transfer back or to other agents. Each agent has its own system prompt defining its role and capabilities. Source: OpenAI Swarm GitHub.',
      category: 'Engineering',
      platform: 'OpenAI Swarm (deprecated)',
      owner: 'openai',
      seedLayer: 'curated',
      sourceUrl: 'https://github.com/openai/swarm',
      sourceName: 'OpenAI Swarm GitHub',
    },

    // -- AutoGen group chat --
    {
      slug: 'autogen-group-agent',
      name: 'AutoGen Conversable Agent',
      avatar: '💬',
      tagline: 'Customizable conversable agent in AutoGen flexible multi-agent conversations.',
      about:
        'Documents the ConversableAgent primitive in AutoGen (arXiv 2308.08155, Microsoft Research). Agents are customizable (persona, capabilities), conversable (can send/receive to any other agent), and support flexible conversation patterns: two-agent dialogue, hierarchical, group chat, or proxy-based orchestration. Used across math, coding, question answering, and decision-making tasks. Framework is open-source. Source: arXiv paper.',
      category: 'Engineering',
      platform: 'AutoGen',
      owner: 'microsoft-research-autogen',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.08155',
      sourceName: 'arXiv 2308.08155 — AutoGen',
    },

    // -- AgentVerse --
    {
      slug: 'agentverse-participant',
      name: 'AgentVerse Participant',
      avatar: '🌐',
      tagline: 'Dynamically recruited specialist in an AgentVerse collaborative group.',
      about:
        'Documents the participant agent role in AgentVerse (arXiv 2308.10848). AgentVerse assembles agent groups dynamically — a group recruitment phase selects specialists relevant to the current task, then agents collaborate and produce peer evaluations. Framework enables emergent group behavior inspired by human social dynamics. Multi-agent groups outperform single agents on problem-solving, science, and NLP tasks per the paper. Source: arXiv paper.',
      category: 'Research',
      platform: 'AgentVerse',
      owner: 'tencent-ai',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.10848',
      sourceName: 'arXiv 2308.10848 — AgentVerse',
    },

    // -- MALBO --
    {
      slug: 'malbo-team-member',
      name: 'MALBO Team Member',
      avatar: '📊',
      tagline: 'LLM agent in a team configuration optimized via Bayesian search — MALBO.',
      about:
        "Documents a team member in the MALBO framework (arXiv 2511.11788, University of Milano-Bicocca). MALBO applies multi-objective Bayesian optimization to search for agent team configurations that balance performance and cost. Bayesian optimization reduced average configuration cost by >45% vs random search while maintaining comparable performance. Specialized heterogeneous teams achieved cost reductions up to 65.8% vs homogeneous baselines. Source: arXiv paper (Master's thesis).",
      category: 'Engineering',
      platform: 'MALBO',
      owner: 'malbo-research',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2511.11788',
      sourceName: 'arXiv 2511.11788 — MALBO',
    },

    // =========================================================
    // ILLUSTRATIVE — existing fictional agents (unchanged)
    // =========================================================
    {
      slug: 'codepilot-cr',
      name: 'CodePilot CR',
      avatar: '🚦',
      tagline: 'Code-review agent for high-volume TypeScript monorepos.',
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
      tagline: 'Performance-focused lens of the CodePilot CR review system.',
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
      tagline: 'Tier-1 customer support resolution with human escalation.',
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
      tagline: 'Invoice reconciliation and expense categorization.',
      category: 'Finance Ops',
      platform: 'Custom',
      owner: 'dkraft',
      seedLayer: 'illustrative',
    },
    {
      slug: 'research-rabbit',
      name: 'Research Rabbit',
      avatar: '🐇',
      tagline: 'Source-cited market and technical research briefs.',
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
      tagline: 'Structured-data extraction blueprint — origin of the Helios swarm.',
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
      tagline: 'EU deployment of the Helios Extractor blueprint.',
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
      tagline: 'US deployment of the Helios Extractor blueprint.',
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
      tagline: 'Context-aware localization across 12 languages.',
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
      tagline: 'Content calendar and brief generation for the Nexus pipeline.',
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
      tagline: 'Long-form content drafting with brand-voice enforcement.',
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
      tagline: 'SEO and quality editing pass for drafted content.',
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
      tagline: 'Product catalog sync, enrichment, and attribute normalization.',
      category: 'E-commerce Ops',
      platform: 'Custom',
      owner: 'shopstream',
      seedLayer: 'illustrative',
    },
    {
      slug: 'shopstream-pricer',
      name: 'PricerAgent',
      avatar: '💰',
      tagline: 'Dynamic repricing based on competitor signals and margin rules.',
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
      tagline: 'Order routing, fulfillment triage, and returns handling.',
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
    // CURATED — New configurations (added QA cycle-01)
    // =========================================================

    // 9. CAMEL
    {
      slug: 'camel-two-agent',
      name: 'CAMEL Role-Playing Two-Agent',
      avatar: '🐪',
      kind: 'team',
      tagline:
        'Inception-prompted AI User + AI Assistant — autonomous cooperative task completion.',
      about:
        'Documents the CAMEL framework (arXiv 2303.17760, NeurIPS 2023, King Abdullah University of Science and Technology). Two agents — AI User and AI Assistant — are given complementary roles and a shared goal via "inception prompting." They converse autonomously to complete the task without human guidance. The paper studies emergent role-playing capabilities and cooperative behaviors. Evaluated across coding, math, and general reasoning. Source: arXiv paper (NeurIPS 2023).',
      topology:
        'Peer (dual-agent dialogue). AI User gives instructions; AI Assistant executes and responds. The conversation is turn-by-turn natural language. Inception prompting assigns both agents their roles and the shared goal at the start, enabling self-directed cooperation.',
      oversight:
        "No human-in-the-loop in the paper's study setup. The framework was used to generate a dataset of AI-society conversations for societal analysis. Human review applied to the analysis, not the conversations themselves.",
      howBuilt:
        'CAMEL open-source framework. Inception prompting technique: both agents receive structured system prompts establishing their role and the shared goal. Communication in natural language only. The CAMEL-AI GitHub (github.com/camel-ai/camel) hosts the implementation.',
      owner: 'camel-ai',
      operationalSince: '2023-03-31',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2303.17760',
      sourceName: 'arXiv 2303.17760 — CAMEL (NeurIPS 2023)',
      topologyType: 'peer',
      agentCount: 2,
      platform: 'CAMEL',
      industries: ['research', 'education'],
      taskKinds: ['cooperative-reasoning', 'role-playing', 'task-completion'],
      whyItWorks:
        'Inception prompting establishes shared role and goal context for both agents, enabling autonomous cooperation without additional human instruction. Turn-by-turn dialogue provides natural checkpoints. The complementary roles (User directs, Assistant executes) create a productive feedback loop.',
      members: [
        ['camel-ai-user', 'AI User', 'Instruction giver driving toward goal'],
        ['camel-ai-assistant', 'AI Assistant', 'Instruction follower executing tasks'],
      ],
    },

    // 10. Generative Agents (Smallville)
    {
      slug: 'generative-agents-smallville',
      name: 'Generative Agents Sandbox',
      avatar: '🏘️',
      kind: 'team',
      tagline: '25 autonomous NPC agents with memory, reflection, planning — emergent social org.',
      about:
        'Documents the Generative Agents sandbox (arXiv 2304.03442, Stanford / Google Research). A Sims-like environment with 25 LLM-powered agents, each maintaining a memory stream of observations. Agents produce "reflections" — higher-level inferences about their experiences — and plan behaviors around those reflections. In the paper\'s study, agents autonomously organized a Valentine\'s Day party over two in-game days without human guidance. Ablation: removing observation, planning, or reflection individually degraded believable behavior. Source: arXiv paper.',
      topology:
        'Peer (emergent social network). 25 agents act independently in a shared environment. No central orchestrator. Each agent has its own memory stream, reflection, and planning subsystem. Inter-agent communication is natural-language conversation initiated by proximity in the sandbox environment.',
      oversight:
        'No operational oversight in the study setup. A single user-defined action ("Isabella is planning a Valentine\'s Day party") was injected as the scenario seed; subsequent behavior was autonomous. Human evaluation used to measure believability.',
      howBuilt:
        'Custom "The Sims-inspired" sandbox environment. Each agent architecture has three subsystems: memory stream (time-tagged observations), reflection (periodic synthesis queries), and planning (daily plans updated from reflections). GPT-3.5 and GPT-4 used per the paper.',
      owner: 'stanford-nlp',
      operationalSince: '2023-04-07',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2304.03442',
      sourceName: 'arXiv 2304.03442 — Generative Agents',
      topologyType: 'peer',
      agentCount: 25,
      platform: 'Custom (The Sims-inspired sandbox)',
      industries: ['research', 'gaming'],
      taskKinds: ['autonomous-simulation', 'social-interaction', 'emergent-behavior'],
      whyItWorks:
        'Memory + reflection + planning enables each agent to act with contextual awareness over time, not just on immediate inputs. Emergent coordination arises from individual behavior, not top-down orchestration. Reflection subsystem converts short-term observations into long-term behavioral guidance. Ablation studies in the paper confirm each component is necessary.',
      members: [
        [
          'generative-agent-npc',
          'Smallville Resident',
          'Autonomous NPC with memory, reflection, and planning',
        ],
      ],
    },

    // 11. SWE-agent
    {
      slug: 'swe-agent-config',
      name: 'SWE-agent (Princeton ACI)',
      avatar: '🐛',
      kind: 'team',
      tagline: 'Solo software agent with custom ACI — 12.5% SWE-bench, 87.7% HumanEvalFix.',
      about:
        "Documents SWE-agent (arXiv 2405.15793, Princeton NLP). A single LM agent equipped with a custom Agent-Computer Interface (ACI) designed for software development tasks. The ACI provides specialized file viewer, editor, and search commands that are more LM-friendly than raw terminal tools. Key benchmark results stated by the paper: 12.5% pass@1 on SWE-bench (unassisted); 87.7% on HumanEvalFix (bug fixing). The paper's main finding: ACI design significantly impacts agent performance on SE tasks. Source: arXiv paper.",
      topology:
        'Solo-plus-tools. Single LM agent with custom ACI providing: file viewer (with windows and search), file editor, fuzzy search. The ACI was designed specifically to match LM working patterns. No sub-agents or orchestration layer.',
      oversight:
        'No human-in-the-loop in benchmark evaluation. Evaluated on 300 issues from SWE-bench and HumanEvalFix. Agent operates autonomously until producing a patch.',
      howBuilt:
        'Custom ACI built on top of a Docker sandboxed environment. File viewing commands show content in windows rather than raw dumps. Edit commands use structured diffs. Search commands support fuzzy matching. Model: Claude 3, GPT-4 (multiple models evaluated in paper). Open-source at github.com/princeton-nlp/SWE-agent.',
      owner: 'princeton-nlp',
      operationalSince: '2024-04-02',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2405.15793',
      sourceName: 'arXiv 2405.15793 — SWE-agent',
      topologyType: 'solo_plus_tools',
      agentCount: 1,
      platform: 'Custom ACI (Docker)',
      industries: ['software-delivery'],
      taskKinds: ['bug-fixing', 'code-editing', 'software-engineering'],
      whyItWorks:
        "LM-designed ACI reduces friction between the model's natural outputs and the execution environment. Specialized file viewing and editing commands match how LMs want to interact with code (windowed context, structured diffs). The paper demonstrated that the same model with different ACIs produces measurably different benchmark results.",
      members: [
        ['swe-agent', 'Software Engineer', 'Autonomous bug fixing and code editing via custom ACI'],
      ],
    },

    // 12. Voyager
    {
      slug: 'voyager-minecraft',
      name: 'Voyager (Minecraft)',
      avatar: '⛏️',
      kind: 'team',
      tagline: 'Open-ended Minecraft agent — 3.3× items, 15.3× tech tree vs prior SOTA.',
      about:
        'Documents Voyager (arXiv 2305.16291, NVIDIA). An open-ended embodied lifelong learning agent using GPT-4, deployed in Minecraft. Three components: automatic curriculum (continuously proposes tasks), skill library (stores reusable programs), iterative prompting (refines code until execution succeeds). Benchmark: 3.3× more unique items obtained, 2.3× longer distances traveled, 15.3× faster tech tree milestone completion vs prior SOTA (DEPS). Does not require fine-tuning. Source: arXiv paper.',
      topology:
        "Solo-plus-tools. Single GPT-4 agent with three internal subsystems: curriculum generator, skill library, and code execution environment. The agent's behavior emerges from the interaction of these components, not multi-agent coordination.",
      oversight:
        'No human-in-the-loop in evaluation. The agent operates autonomously for extended exploration sessions. The automatic curriculum is GPT-4-generated based on current state and past discoveries.',
      howBuilt:
        'GPT-4 API with Mineflayer JavaScript API for Minecraft control. Curriculum generation uses GPT-4 with exploration state context. Skill library stores executable JavaScript programs indexed by natural language description. Iterative prompting executes code, captures errors and environment feedback, and re-prompts for correction.',
      owner: 'nvidia-voyager',
      operationalSince: '2023-05-25',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2305.16291',
      sourceName: 'arXiv 2305.16291 — Voyager',
      topologyType: 'solo_plus_tools',
      agentCount: 1,
      platform: 'GPT-4 API (Mineflayer/Minecraft)',
      industries: ['gaming', 'research'],
      taskKinds: ['open-ended-exploration', 'skill-acquisition', 'embodied-reasoning'],
      whyItWorks:
        'Automatic curriculum keeps the agent in a productive challenge range — not too easy, not impossible. Skill library prevents re-learning already-discovered capabilities. Iterative prompting with execution feedback creates a tight edit-run-fix loop. The combination enables compound skill growth over long sessions.',
      members: [
        ['voyager-agent', 'Explorer', 'Open-ended exploration with curriculum + skill library'],
      ],
    },

    // 13. Aider Architect/Editor
    {
      slug: 'aider-architect-editor',
      name: 'Aider Architect/Editor',
      avatar: '📐',
      kind: 'team',
      tagline: 'Two-role pipeline: reasoning architect + format-specialist editor — 85% SWE-bench.',
      about:
        "Documents Aider's architect/editor mode (aider.chat blog, 2024-09-26). Two-role pipeline: an Architect (strong reasoning model, e.g. o1-preview) thinks through required code changes; an Editor (fast model, e.g. o1-mini) applies them in the correct edit format. Key insight from the post: separating reasoning from formatting compliance allows using the best model for thinking without penalizing it for edit-format tasks. Benchmark: o1-preview (architect) + o1-mini (editor) achieves 85.0% on SWE-bench. Source: Aider blog post.",
      topology:
        'Pipeline (two-stage). Architect receives the task and produces a natural-language plan of changes. Editor receives the plan and applies edits in the required diff format. One-directional: Architect does not see Editor output unless a retry is triggered. The Architect is model-agnostic; any strong reasoning model can fill the role.',
      oversight:
        "User reviews changes via Aider's standard diff review workflow. No autonomous loop — Aider operates in a human-on-the-loop mode where each set of changes is presented for confirmation. Source: Aider blog.",
      howBuilt:
        'Aider open-source CLI. Architect model specified separately from editor model in config. Tested combinations include: o1-preview + o1-mini (85.0% SWE-bench), Claude 3.5 Sonnet as both roles (80.5%), Claude 3.5 Sonnet (architect) + various editors. Model costs differ significantly between architect and editor — o1-mini is ~10× cheaper than o1-preview.',
      owner: 'aider-ai',
      operationalSince: '2024-09-26',
      seedLayer: 'curated',
      sourceUrl: 'https://aider.chat/2024/09/26/architect.html',
      sourceName: 'Aider blog — Architect/Editor Mode',
      topologyType: 'pipeline',
      agentCount: 2,
      platform: 'Aider',
      industries: ['software-delivery'],
      taskKinds: ['code-editing', 'bug-fixing', 'refactoring'],
      whyItWorks:
        "Separating reasoning from edit-format compliance removes conflicting objectives from a single model. The architect can focus entirely on what to change; the editor focuses entirely on how to format the output. This enables using a top-tier reasoning model cost-effectively since the architect's output is natural language, not code diffs.",
      members: [
        [
          'aider-architect',
          'Architect',
          'Plans code changes in natural language using strong reasoning model',
        ],
        ['aider-editor', 'Editor', 'Applies edits in correct diff format using fast model'],
      ],
    },

    // 14. OpenHands
    {
      slug: 'openhands-dev',
      name: 'OpenHands (OpenDevin)',
      avatar: '🙌',
      kind: 'team',
      tagline: 'Open-source AI software developer with sandboxed runtime — ICLR 2025.',
      about:
        'Documents OpenHands (arXiv 2407.16741, accepted ICLR 2025; formerly OpenDevin, All Hands AI). An open-source platform for AI software developers with 188+ contributors. The primary agent operates in a sandboxed container with access to web browser, file system, and code execution. Designed as a general-purpose software development platform. Evaluated on SWE-bench and WebArena task suites. Supports multiple runtime environments: local Docker, cloud, modal. Source: arXiv paper (ICLR 2025 accepted).',
      topology:
        "Solo-plus-tools. Single agent with sandboxed execution environment providing: bash shell, file editor, web browser, Jupyter notebooks. Agent selects and sequences actions autonomously. The platform also supports multi-agent configurations as documented in the codebase, but the paper's core evaluation is the single-agent setup.",
      oversight:
        'Sandbox isolation by default. Human can review and intervene at any step. Platform supports both autonomous mode and interactive mode. Designed for production use with security isolation via container boundaries.',
      howBuilt:
        'Docker-containerized sandbox with persistent state. Web UI for interaction. REST API for programmatic control. 188+ contributors. Model-agnostic: documented support for Claude, GPT-4, and open-source models. Open-source at github.com/All-Hands-AI/OpenHands.',
      owner: 'all-hands-ai',
      operationalSince: '2024-07-23',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2407.16741',
      sourceName: 'arXiv 2407.16741 — OpenHands (ICLR 2025)',
      topologyType: 'solo_plus_tools',
      agentCount: 1,
      platform: 'OpenHands',
      industries: ['software-delivery'],
      taskKinds: ['software-development', 'bug-fixing', 'web-navigation', 'code-execution'],
      whyItWorks:
        'Sandboxed execution environment provides safety isolation while giving the agent full system access within the container. Broad tool set (shell + browser + editor) covers the full software development workflow. Open-source with large contributor base (188+) drives rapid iteration.',
      members: [
        [
          'openhands-agent',
          'AI Developer',
          'Generalist software development in sandboxed environment',
        ],
      ],
    },

    // 15. smolagents
    {
      slug: 'smolagents-code',
      name: 'smolagents CodeAgent',
      avatar: '🐍',
      kind: 'team',
      tagline:
        'Python-first multi-provider agent — minimal 1K-line library, MCP + LangChain tools.',
      about:
        'Documents the CodeAgent in smolagents (Hugging Face). CodeAgent writes Python code snippets as actions rather than JSON tool-call objects, improving performance on code-heavy tasks. Core library: ~1000 lines. Supports any model provider: HuggingFace Inference, OpenAI, Anthropic, LiteLLM, Transformers, Ollama. Integrates with MCP servers and LangChain tools. Multi-agent orchestration supported: one CodeAgent can call sub-agents as tools. Source: Hugging Face smolagents documentation.',
      topology:
        'Solo-plus-tools (single agent) or hub-and-spoke (multi-agent). CodeAgent primary; can orchestrate ToolCallingAgents as subagents. Each subagent is called as a tool by the coordinator agent. Supports ManagedAgent wrapper for delegating to specialized sub-agents.',
      oversight:
        'User controls model selection and tool access. Library is minimal by design — ~1K lines — to maximize auditability. Sandboxed code execution recommended for production deployments. Source: smolagents docs.',
      howBuilt:
        'Python package (pip install smolagents). Agents defined with a model (any provider) and a list of tools. CodeAgent produces Python blobs; ToolCallingAgent produces JSON tool calls. Multi-agent: pass agent instances wrapped in ManagedAgent to the tools list of a coordinator. Tutorial notebooks in the docs.',
      owner: 'huggingface',
      operationalSince: '2025-01-01',
      seedLayer: 'curated',
      sourceUrl: 'https://huggingface.co/docs/smolagents/en/index',
      sourceName: 'Hugging Face — smolagents docs',
      topologyType: 'solo_plus_tools',
      agentCount: 1,
      platform: 'smolagents (Python)',
      industries: ['software-delivery', 'research', 'data-extraction'],
      taskKinds: ['code-execution', 'tool-use', 'multi-agent-orchestration'],
      whyItWorks:
        'Python-as-actions reduces the translation overhead between LM output and execution. Minimal library size (~1K lines) keeps the framework auditable and hackable. Broad provider support avoids vendor lock-in. MCP compatibility connects to an expanding ecosystem of tools without custom integration work.',
      members: [
        [
          'smolagents-code-agent',
          'CodeAgent',
          'Python-writing agent orchestrating tools and sub-agents',
        ],
      ],
    },

    // 16. OpenAI Swarm
    {
      slug: 'openai-swarm-triage',
      name: 'OpenAI Swarm Triage Pattern',
      avatar: '🔀',
      kind: 'team',
      tagline:
        'Triage-to-specialist handoff pattern — stateless, client-side, Chat Completions API.',
      about:
        'Documents the triage-to-specialist handoff pattern in OpenAI Swarm (github.com/openai/swarm). Note: Swarm is an educational/deprecated framework superseded by the OpenAI Agents SDK. Core primitive: the "handoff" — an agent transfers conversation control to another agent. A triage agent receives incoming requests and routes to specialist agents by intent. Entirely client-side: no server state; state lives in the messages array. Source: OpenAI Swarm GitHub.',
      topology:
        'Hub-and-spoke (handoff-based). Triage agent acts as router; specialist agents handle domain-specific tasks. Handoffs are represented as tool calls that return a new Agent object. Specialists can hand back to triage or to other specialists. Each agent has its own instructions and tools.',
      oversight:
        'Stateless design: all state is in the messages array, making the full conversation history inspectable. Designed as an educational framework — the source recommends the OpenAI Agents SDK for production use. Source: Swarm GitHub.',
      howBuilt:
        'Python package built on top of Chat Completions API. Agents defined with instructions and tools (Python functions). Handoffs are tool functions returning another Agent. The run_demo_loop() utility handles the REPL. Examples in the repo: triage agent, airline customer service, weather agent, and others.',
      owner: 'openai',
      operationalSince: '2024-10-11',
      seedLayer: 'curated',
      sourceUrl: 'https://github.com/openai/swarm',
      sourceName: 'OpenAI Swarm GitHub',
      topologyType: 'hub_and_spoke',
      agentCount: 3,
      platform: 'OpenAI Swarm (deprecated)',
      industries: ['customer-support', 'operations'],
      taskKinds: ['intent-routing', 'customer-service', 'task-handoff'],
      whyItWorks:
        'Handoff primitive is simple and composable: any agent can route to any other via a tool call. Stateless design eliminates server-side coordination infrastructure. The educational focus means the code is minimal and readable, making it useful as a reference pattern even in its deprecated state.',
      members: [
        [
          'swarm-triage-agent',
          'Triage Agent',
          'Receives requests and routes to specialists via handoff',
        ],
        [
          'swarm-specialist-agent',
          'Specialist Agent',
          'Handles domain-specific tasks after handoff',
        ],
      ],
    },

    // 17. AutoGen Group Chat
    {
      slug: 'autogen-group-chat',
      name: 'AutoGen Group Chat',
      avatar: '💬',
      kind: 'team',
      tagline: 'Flexible multi-agent group conversation — hierarchical, peer, or proxy topologies.',
      about:
        'Documents AutoGen (arXiv 2308.08155, Microsoft Research). A framework for multi-agent LLM applications using "conversable agents" — customizable agents that can send/receive messages to any other agent. Supports multiple conversation patterns: two-agent chat, group chat (three or more agents), hierarchical, and "nested conversations" (agent-within-agent). Used across coding, math, question answering, and decision-making tasks. Open-source framework. Source: arXiv paper.',
      topology:
        'Flexible. Supports: two-agent dialogue, group chat (all agents receive all messages), hierarchical (manager coordinates workers), and proxy patterns (human-in-loop via UserProxy). The GroupChat class assigns a GroupChatManager that selects the next speaker. Speaker selection strategies: auto, round-robin, random, or manual.',
      oversight:
        'UserProxy agent enables human-in-the-loop patterns: a human can review and provide input at configurable intervals. Configurable human input modes: ALWAYS, NEVER, TERMINATE. Code execution can be sandboxed via Docker.',
      howBuilt:
        'Python package. Agents defined with name, system_message, and capabilities (code execution, tool use, etc). GroupChat connects agents via GroupChatManager. Supports OpenAI, Azure, Claude, and local models. AutoGenBench tool for isolated benchmark evaluation.',
      owner: 'microsoft-research-autogen',
      operationalSince: '2023-08-16',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.08155',
      sourceName: 'arXiv 2308.08155 — AutoGen',
      topologyType: 'hierarchical',
      agentCount: 3,
      platform: 'AutoGen',
      industries: ['software-delivery', 'research', 'data-extraction'],
      taskKinds: ['multi-agent-dialogue', 'coding', 'problem-solving', 'human-in-loop'],
      whyItWorks:
        'Conversable agent abstraction is simple enough to compose in many topologies without framework rewrites. Human-in-loop proxy enables controlled autonomy. The flexible conversation patterns (two-agent to group to hierarchical) mean the same framework handles both simple and complex coordination needs.',
      members: [
        ['autogen-group-agent', 'ConversableAgent', 'Customizable agent in group conversation'],
      ],
    },

    // 18. AgentVerse
    {
      slug: 'agentverse-group',
      name: 'AgentVerse Dynamic Group',
      avatar: '🌐',
      kind: 'team',
      tagline:
        'Dynamically recruited specialist group — outperforms single agents on science and NLP.',
      about:
        'Documents AgentVerse (arXiv 2308.10848, Tencent AI Lab). A framework for dynamic multi-agent group formation. Group recruitment: a coordinator selects agents relevant to the current task from a candidate pool. Then agents collaborate in a structured discussion phase and produce peer evaluations. Paper claims multi-agent groups outperform single agents on scientific question answering, tabular reasoning, and reading comprehension tasks. Source: arXiv paper.',
      topology:
        "Hierarchical (dynamic recruitment). A recruitment/coordinator phase selects specialist agents per task. Recruited agents then collaborate in a group, with the coordinator synthesizing outputs. Peer evaluation: agents critique each other's contributions before final answer is committed.",
      oversight:
        'Coordinator agent manages recruitment and synthesis. Peer evaluation built into the collaboration phase. No human-in-loop described in paper evaluation.',
      howBuilt:
        'Python framework with configurable agent pool. Each agent has a persona and expertise. Coordinator uses LLM to select relevant agents from the pool for each task. Supported models: GPT-3.5, GPT-4. Open-source at github.com/OpenBMB/AgentVerse.',
      owner: 'tencent-ai',
      operationalSince: '2023-08-21',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2308.10848',
      sourceName: 'arXiv 2308.10848 — AgentVerse',
      topologyType: 'hierarchical',
      agentCount: 4,
      platform: 'AgentVerse',
      industries: ['research', 'education'],
      taskKinds: ['scientific-reasoning', 'question-answering', 'collaborative-analysis'],
      whyItWorks:
        'Dynamic recruitment means the group is tailored to the task rather than using a static team. Peer evaluation catches errors before commitment. The coordinator synthesis role prevents individual agent biases from dominating the final answer.',
      members: [
        [
          'agentverse-participant',
          'Recruited Specialist',
          'Domain expert dynamically recruited per task',
        ],
      ],
    },

    // 19. MALBO
    {
      slug: 'malbo-optimized-team',
      name: 'MALBO Bayesian-Optimized Team',
      avatar: '📊',
      kind: 'team',
      tagline: 'Multi-objective Bayesian search for team config — >45% cost reduction vs random.',
      about:
        "Documents MALBO (arXiv 2511.11788, University of Milano-Bicocca, Master's thesis). A framework that applies multi-objective Bayesian optimization (BO) to search the space of agent team configurations, balancing task performance and API cost. BO outperformed random search: >45% cost reduction on average while maintaining comparable performance. Heterogeneous specialized teams achieved cost reductions up to 65.8% vs homogeneous (all same model) baselines. Source: arXiv paper (note: Master's thesis, not peer-reviewed).",
      topology:
        'Hierarchical (configurable by search). MALBO searches the configuration space: which agent roles, which model per role, which team size. The output is an optimized configuration for a specific task type. The resulting team can be any topology (hierarchical is the primary studied case).',
      oversight:
        'Multi-objective optimization loop is automated. Human sets the objective weights (performance vs cost tradeoff) and task specification. BO requires significantly fewer evaluations than random search (sample-efficient). Source: arXiv paper.',
      howBuilt:
        'Python implementation using Bayesian optimization libraries. Task evaluated on a standardized benchmark. Configuration space: model selection per role, number of agents, role assignments. Pareto-frontier search identifies configurations that are not dominated on both objectives simultaneously.',
      owner: 'malbo-research',
      operationalSince: '2024-11-18',
      seedLayer: 'curated',
      sourceUrl: 'https://arxiv.org/abs/2511.11788',
      sourceName: 'arXiv 2511.11788 — MALBO',
      topologyType: 'hierarchical',
      agentCount: 3,
      platform: 'MALBO',
      industries: ['research', 'software-delivery'],
      taskKinds: ['configuration-optimization', 'cost-performance-tradeoff', 'team-design'],
      whyItWorks:
        'Bayesian optimization is sample-efficient — it finds good configurations in far fewer trials than random search. Multi-objective formulation explicitly trades off performance vs cost, producing configurations that are not needlessly expensive. Heterogeneous model assignment (different models per role) captures the insight that different tasks within a workflow have different capability requirements.',
      members: [
        [
          'malbo-team-member',
          'Optimized Team Member',
          'Role and model assigned by Bayesian optimization search',
        ],
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
      tagline: 'Bilingual support pod: frontline resolution plus localization.',
      about:
        'A fictional demo configuration illustrating a bilingual customer support pod. Haven Support handles tier-1 ticket resolution and intent triage; TranslateFlow provides inbound and outbound localization across 12 languages. The configuration ran a bilingual launch for a German e-commerce customer and sustained sub-2-minute median first response for 60 days. (Fictional — illustrative demo data.)',
      topology:
        'Frontline/specialist split: Haven Support resolves; TranslateFlow localizes inbound and outbound. (Fictional.)',
      oversight:
        'Refund and escalation decisions above a cost threshold require human review. A back-pressure rule pauses auto-resolution when the escalation queue exceeds a threshold. (Fictional.)',
      howBuilt:
        'CrewAI sequential crew. Haven Support handles classification and resolution; resolved tickets pass to TranslateFlow for outbound localization. Brand-tone rules encoded in Haven system prompt. (Fictional.)',
      whyItWorks:
        'Separating resolution from localization keeps each agent focused on a single concern. The pipeline order (resolve → localize) prevents localization of draft responses that may still change. Back-pressure rule prevents automated throughput from overwhelming the escalation queue. (Fictional.)',
      operationalSince: '2025-11-01',
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
      tagline: 'Homogeneous extraction worker pool deployed from a single blueprint.',
      about:
        'A fictional demo configuration illustrating a homogeneous swarm pattern. All workers are instances of the Helios Extractor blueprint — a single configuration deployed across EU and US regions. Workers consume jobs from a shared queue; a job ledger tracks state and output validation results. Blueprint v3 introduced schema-validated outputs, reducing downstream data errors. (Fictional — illustrative demo data.)',
      topology:
        'Coordinator-less pool. Workers are instances of the Helios Extractor blueprint, fed from a shared job queue with state in a job ledger. (Fictional.)',
      oversight:
        'Validation failures above 1% trigger an alert to the owner. Blueprint updates require review before deployment to all workers. (Fictional.)',
      howBuilt:
        'Custom event-driven architecture. Workers poll a Redis-backed job queue. Each worker runs the same extraction pipeline: fetch → parse → validate → write. Schema validation is applied at the write step; failures go to a dead-letter queue. (Fictional.)',
      whyItWorks:
        'Homogeneous workers simplify deployment and debugging — a bug in one worker is a bug in all, so the failure surface is small. Blueprint versioning lets the team update all workers atomically. Regional deployment (EU, US) reduces extraction latency for geographically distributed sources. (Fictional.)',
      operationalSince: '2025-10-15',
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
      tagline: 'Plan → Write → Edit content pipeline with brand-voice enforcement.',
      about:
        'A fictional demo configuration illustrating a three-stage content production pipeline. NexusPlanner generates briefs and assigns publication calendar slots; NexusWriter produces long-form drafts with brand-voice rules embedded in the system prompt; NexusEditor runs SEO analysis and quality passes before a human review gate. The pipeline has published over 500 articles since launch. (Fictional — illustrative demo data.)',
      operationalSince: '2025-09-01',
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
      tagline: 'E-commerce ops trio: catalog sync, dynamic repricing, order triage.',
      about:
        'A fictional demo configuration illustrating a peer specialist pool for e-commerce operations. Three agents share a domain with clear ownership: CatalogAgent syncs and enriches product data; PricerAgent runs dynamic repricing from competitor feeds within margin rules; OpsAgent handles order routing, fulfillment tracking, and returns. Cross-agent coordination happens via a shared event ledger rather than direct coupling. Processed over 48,000 orders including a spring sale spike. (Fictional — illustrative demo data.)',
      operationalSince: '2025-08-01',
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
      tagline: 'Three-lens parallel PR review: security, performance, test coverage.',
      about:
        'A fictional demo configuration illustrating a parallel peer review pattern for CI pipelines. Three CodePilot CR instances each review the same PR diff simultaneously, each focused on a single lens: security vulnerabilities, performance regressions, and test coverage gaps. LedgerLine tracks findings and cost allocation. A synthesis step deduplicates and merges findings before presenting a unified report. Achieved 1,000 PRs reviewed with zero missed HIGH-severity findings. (Fictional — illustrative demo data.)',
      operationalSince: '2025-12-01',
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

    // -- New curated configuration proof entries (QA cycle-01 additions) --
    {
      subject: ['configuration', 'camel-two-agent'],
      date: '2023-03-31',
      type: 'artifact',
      title: 'CAMEL paper published — arXiv 2303.17760 (NeurIPS 2023)',
      body: 'Introduces inception prompting and the AI User / AI Assistant role-playing framework. Studies emergent cooperative behaviors in a 2-agent setup.',
      evidenceUrl: 'https://arxiv.org/abs/2303.17760',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'generative-agents-smallville'],
      date: '2023-04-07',
      type: 'artifact',
      title: 'Generative Agents paper published — arXiv 2304.03442',
      body: "25 agents in a Sims-inspired sandbox autonomously organized a Valentine's Day party. Ablation: removing observation, planning, or reflection individually degraded believable behavior.",
      evidenceUrl: 'https://arxiv.org/abs/2304.03442',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'swe-agent-config'],
      date: '2024-04-02',
      type: 'artifact',
      title: 'SWE-agent paper published — arXiv 2405.15793',
      body: '12.5% pass@1 on SWE-bench; 87.7% on HumanEvalFix. Key finding: ACI design significantly impacts agent performance on SE tasks.',
      evidenceUrl: 'https://arxiv.org/abs/2405.15793',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'voyager-minecraft'],
      date: '2023-05-25',
      type: 'artifact',
      title: 'Voyager paper published — arXiv 2305.16291',
      body: '3.3× more unique items, 2.3× longer distances, 15.3× faster tech tree milestones vs prior SOTA (DEPS). No fine-tuning required.',
      evidenceUrl: 'https://arxiv.org/abs/2305.16291',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'aider-architect-editor'],
      date: '2024-09-26',
      type: 'artifact',
      title: 'Aider architect/editor mode blog post published',
      body: 'o1-preview (architect) + o1-mini (editor) = 85.0% on SWE-bench. Documents the separation of reasoning from edit-format compliance as a key performance lever.',
      evidenceUrl: 'https://aider.chat/2024/09/26/architect.html',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'openhands-dev'],
      date: '2024-07-23',
      type: 'artifact',
      title: 'OpenHands paper published — arXiv 2407.16741 (accepted ICLR 2025)',
      body: 'Open-source AI software developer platform with 188+ contributors. Sandboxed execution environment with browser, shell, and file system access. Evaluated on SWE-bench and WebArena.',
      evidenceUrl: 'https://arxiv.org/abs/2407.16741',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'smolagents-code'],
      date: '2025-01-01',
      type: 'artifact',
      title: 'smolagents CodeAgent documented in Hugging Face docs',
      body: 'CodeAgent writes Python as actions rather than JSON tool calls. ~1000-line core library. Supports HuggingFace, OpenAI, Anthropic, LiteLLM, Transformers, Ollama. MCP and LangChain tool integration.',
      evidenceUrl: 'https://huggingface.co/docs/smolagents/en/index',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'openai-swarm-triage'],
      date: '2024-10-11',
      type: 'artifact',
      title: 'OpenAI Swarm GitHub repository published (educational, now deprecated)',
      body: 'Core primitive: handoff — an agent transfers conversation control to another agent. Stateless: all state in the messages array. Superseded by OpenAI Agents SDK for production use.',
      evidenceUrl: 'https://github.com/openai/swarm',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'autogen-group-chat'],
      date: '2023-08-16',
      type: 'artifact',
      title: 'AutoGen paper published — arXiv 2308.08155',
      body: 'Flexible multi-agent framework: two-agent, group chat, hierarchical, and proxy (human-in-loop) patterns. Open-source. Used across coding, math, QA, and decision-making tasks.',
      evidenceUrl: 'https://arxiv.org/abs/2308.08155',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'agentverse-group'],
      date: '2023-08-21',
      type: 'artifact',
      title: 'AgentVerse paper published — arXiv 2308.10848',
      body: 'Dynamic group recruitment selects task-relevant specialist agents per query. Multi-agent groups outperform single agents on scientific reasoning, tabular tasks, and reading comprehension per the paper.',
      evidenceUrl: 'https://arxiv.org/abs/2308.10848',
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'malbo-optimized-team'],
      date: '2024-11-18',
      type: 'artifact',
      title: 'MALBO paper published — arXiv 2511.11788',
      body: ">45% cost reduction vs random search; heterogeneous teams: up to 65.8% cost reduction vs homogeneous baseline. Note: Master's thesis, not peer-reviewed.",
      evidenceUrl: 'https://arxiv.org/abs/2511.11788',
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

    // -- New curated metrics (QA cycle-01 additions, evidence_linked) --
    {
      subject: ['configuration', 'swe-agent-config'],
      key: 'success_rate',
      label: 'SWE-bench pass@1',
      value: 12.5,
      unit: 'pct',
      asOf: '2024-04-02',
      note: 'Unassisted; SWE-bench benchmark (300 GitHub issues). Source: arXiv 2405.15793 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'swe-agent-config'],
      key: 'human_eval_fix',
      label: 'HumanEvalFix score',
      value: 87.7,
      unit: 'pct',
      asOf: '2024-04-02',
      note: 'Bug fixing benchmark. Source: arXiv 2405.15793 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'voyager-minecraft'],
      key: 'items_multiplier',
      label: 'Unique items vs SOTA',
      value: 3.3,
      unit: 'count',
      asOf: '2023-05-25',
      note: '3.3× more unique items obtained vs prior SOTA (DEPS). Source: arXiv 2305.16291 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'voyager-minecraft'],
      key: 'tech_tree_speed',
      label: 'Tech tree speed vs SOTA',
      value: 15.3,
      unit: 'count',
      asOf: '2023-05-25',
      note: '15.3× faster tech tree milestone completion vs prior SOTA (DEPS). Source: arXiv 2305.16291 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'aider-architect-editor'],
      key: 'success_rate',
      label: 'SWE-bench score',
      value: 85.0,
      unit: 'pct',
      asOf: '2024-09-26',
      note: 'o1-preview (architect) + o1-mini (editor). Source: aider.chat/2024/09/26/architect.html [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'malbo-optimized-team'],
      key: 'cost_reduction',
      label: 'Cost reduction vs random',
      value: 45,
      unit: 'pct',
      asOf: '2024-11-18',
      note: '>45% cost reduction on average vs random search with comparable performance. Source: arXiv 2511.11788 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // -- Additional curated metrics (QA cycle-02 additions, evidence_linked) --

    // anthropic-swe-bench-agent: add previous SOTA baseline for context
    {
      subject: ['configuration', 'anthropic-swe-bench-agent'],
      key: 'prior_sota_pct',
      label: 'Prior SOTA at publication',
      value: 45,
      unit: 'pct',
      asOf: '2024-10-22',
      note: 'Previous best on SWE-bench Verified before Claude 3.5 Sonnet result. Source: https://www.anthropic.com/research/swe-bench-sonnet [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // magentic-one: AssistantBench accuracy
    {
      subject: ['configuration', 'magentic-one'],
      key: 'assistantbench_score',
      label: 'AssistantBench accuracy',
      value: 25.3,
      unit: 'pct',
      asOf: '2024-11-07',
      note: '±6.3; default GPT-4o-2024-05-13. Source: arXiv 2411.04468 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // metagpt-pipeline: executability score and MBPP
    {
      subject: ['configuration', 'metagpt-pipeline'],
      key: 'executability_score',
      label: 'Executability score (SoftwareDev)',
      value: 3.75,
      unit: 'count',
      asOf: '2023-08-01',
      note: '3.75/4; vs ChatDev 2.25. Source: arXiv 2308.00352 Table 3 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'metagpt-pipeline'],
      key: 'mbpp_score',
      label: 'MBPP Pass@1',
      value: 87.7,
      unit: 'pct',
      asOf: '2023-08-01',
      note: 'With executable feedback loop. Source: arXiv 2308.00352 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // chatdev-pipeline: executability and win rate
    {
      subject: ['configuration', 'chatdev-pipeline'],
      key: 'executability_score',
      label: 'Executability score',
      value: 0.88,
      unit: 'count',
      asOf: '2023-07-14',
      note: 'vs GPT-Engineer 0.36, MetaGPT 0.41. Source: arXiv 2307.07924 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'chatdev-pipeline'],
      key: 'win_rate_pct',
      label: 'Win rate vs GPT-Engineer',
      value: 77,
      unit: 'pct',
      asOf: '2023-07-14',
      note: 'Human evaluation: 77% of ChatDev tasks rated better than GPT-Engineer. Source: arXiv 2307.07924 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // aider-architect-editor: Claude 3.5 score alongside o1 score
    {
      subject: ['configuration', 'aider-architect-editor'],
      key: 'claude_35_both_score',
      label: 'SWE-bench (Claude 3.5, both roles)',
      value: 80.5,
      unit: 'pct',
      asOf: '2024-09-26',
      note: 'Claude 3.5 Sonnet as both architect and editor. Source: aider.chat/2024/09/26/architect.html [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // voyager-minecraft: distance multiplier
    {
      subject: ['configuration', 'voyager-minecraft'],
      key: 'distance_multiplier',
      label: 'Exploration distance vs SOTA',
      value: 2.3,
      unit: 'count',
      asOf: '2023-05-25',
      note: '2.3× longer distances explored vs DEPS (prior SOTA). Source: arXiv 2305.16291 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // malbo-optimized-team: heterogeneous cost reduction
    {
      subject: ['configuration', 'malbo-optimized-team'],
      key: 'cost_reduction_heterogeneous',
      label: 'Cost reduction (heterogeneous vs homogeneous)',
      value: 65.8,
      unit: 'pct',
      asOf: '2024-11-18',
      note: 'Heterogeneous MALBO team vs homogeneous GPT-4 team; comparable task performance. Source: arXiv 2511.11788 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // openhands-dev: SWE-Bench Lite (Claude 3.5 Sonnet)
    {
      subject: ['configuration', 'openhands-dev'],
      key: 'success_rate',
      label: 'SWE-bench Lite resolved',
      value: 26,
      unit: 'pct',
      asOf: '2024-07-16',
      note: 'CodeActAgent v1.8 with claude-3-5-sonnet@20240620 on SWE-bench Lite (300 instances). Source: arXiv 2407.16741 Table 1 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'openhands-dev'],
      key: 'human_eval_fix',
      label: 'HumanEvalFix score',
      value: 79.3,
      unit: 'pct',
      asOf: '2024-07-16',
      note: 'CodeActAgent v1.5, 0-shot, GPT-4o-2024-05-13. Source: arXiv 2407.16741 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // autogen-group-chat: MATH dataset and ALFWorld
    {
      subject: ['configuration', 'autogen-group-chat'],
      key: 'success_rate',
      label: 'MATH dataset accuracy',
      value: 69.48,
      unit: 'pct',
      asOf: '2023-08-16',
      note: 'Full MATH test set; GPT-4 alone: 55.18%. Source: arXiv 2308.08155 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'autogen-group-chat'],
      key: 'alfworld_gain',
      label: 'ALFWorld 3-agent gain vs 2-agent',
      value: 15,
      unit: 'pct',
      asOf: '2023-08-16',
      note: '3-agent grounding system: ~15% performance gain on 134 ALFWorld unseen tasks vs 2-agent baseline. Source: arXiv 2308.08155 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // agentverse-group: HumanEval and tool utilization
    {
      subject: ['configuration', 'agentverse-group'],
      key: 'success_rate',
      label: 'HumanEval Pass@1 (GPT-4, group)',
      value: 89,
      unit: 'pct',
      asOf: '2023-08-29',
      note: 'GPT-4 multi-agent group: 89.0% vs solo 87.2% vs CoT 83.5%. Source: arXiv 2308.10848 Table 2 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'agentverse-group'],
      key: 'tool_tasks_completed',
      label: 'Complex tool tasks completed',
      value: 9,
      unit: 'count',
      asOf: '2023-08-29',
      note: '9/10 complex tool-use tasks completed vs 3/10 for single ReAct agent. Source: arXiv 2308.10848 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // camel-two-agent: win rate vs single agent
    {
      subject: ['configuration', 'camel-two-agent'],
      key: 'win_rate_pct',
      label: 'Win rate vs single-shot GPT-3.5',
      value: 76.3,
      unit: 'pct',
      asOf: '2023-03-31',
      note: 'Human evaluation: CAMEL agents won 76.3%, draws 13.3%, GPT-3.5-turbo won 10.4% (AI Society tasks). Source: arXiv 2303.17760 Table 1 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'camel-two-agent'],
      key: 'gpt4_eval_win_rate',
      label: 'Win rate (GPT-4 evaluation)',
      value: 73,
      unit: 'pct',
      asOf: '2023-03-31',
      note: 'GPT-4 automated evaluation: CAMEL 73.0%, draws 4.0%, GPT-3.5-turbo 23.0%. Source: arXiv 2303.17760 Table 1 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // generative-agents-smallville: TrueSkill and hallucination rate
    {
      subject: ['configuration', 'generative-agents-smallville'],
      key: 'trueskill_rating',
      label: 'TrueSkill believability (full arch)',
      value: 29.89,
      unit: 'count',
      asOf: '2023-04-07',
      note: 'μ=29.89, σ=0.72; vs no-memory baseline μ=21.21; d=8.16 SDs. 100 Prolific evaluators. Source: arXiv 2304.03442 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    {
      subject: ['configuration', 'generative-agents-smallville'],
      key: 'hallucination_rate',
      label: 'Hallucination rate',
      value: 1.3,
      unit: 'pct',
      asOf: '2023-04-07',
      note: '6/453 agent responses hallucinated relationship facts (n=6). Source: arXiv 2304.03442 [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // smolagents-code: code size (stated as ~1000 LOC)
    {
      subject: ['configuration', 'smolagents-code'],
      key: 'codebase_loc',
      label: 'Agent logic lines of code',
      value: 1000,
      unit: 'count',
      asOf: '2025-01-01',
      note: '~1000 lines: "The logic for agents fits in ~thousand lines of code." Source: huggingface.co/docs/smolagents [evidence_linked]',
      illustrative: false,
      provenance: 'evidence_linked',
    },
    // smolagents: no benchmark scores published on main docs page; null metric as honest label
    {
      subject: ['configuration', 'smolagents-code'],
      key: 'success_rate',
      label: 'Benchmark task success rate',
      value: null,
      unit: 'pct',
      asOf: '2025-01-01',
      note: 'No standardized benchmark figures stated on HuggingFace smolagents docs at time of indexing.',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // anthropic-orchestrator-workers: no quantitative figures in source
    {
      subject: ['configuration', 'anthropic-orchestrator-workers'],
      key: 'success_rate',
      label: 'Task success rate',
      value: null,
      unit: 'pct',
      asOf: '2024-12-19',
      note: 'Anthropic "Building effective agents" guide is a pattern reference; no benchmark figures stated. Source: anthropic.com/research/building-effective-agents',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // claude-code-subagents: no external benchmark figures
    {
      subject: ['configuration', 'claude-code-subagents'],
      key: 'success_rate',
      label: 'Task success rate',
      value: null,
      unit: 'pct',
      asOf: '2025-01-01',
      note: 'Claude Code subagent patterns — no published benchmark figures at time of indexing.',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // claude-code-agent-teams: no external benchmark figures
    {
      subject: ['configuration', 'claude-code-agent-teams'],
      key: 'success_rate',
      label: 'Task success rate',
      value: null,
      unit: 'pct',
      asOf: '2025-01-01',
      note: 'Claude Code multi-agent team patterns — no published benchmark figures at time of indexing.',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // crewai-research-crew: no benchmark figures in tutorial source
    {
      subject: ['configuration', 'crewai-research-crew'],
      key: 'success_rate',
      label: 'Task success rate',
      value: null,
      unit: 'pct',
      asOf: '2024-01-01',
      note: 'CrewAI first-crew guide is a tutorial; no empirical benchmark data stated. Source: docs.crewai.com/guides/crews/first-crew',
      illustrative: false,
      provenance: 'evidence_linked',
    },

    // openai-swarm-triage: no benchmark figures in source
    {
      subject: ['configuration', 'openai-swarm-triage'],
      key: 'success_rate',
      label: 'Task success rate',
      value: null,
      unit: 'pct',
      asOf: '2024-10-01',
      note: 'OpenAI Swarm is an educational/experimental framework; no benchmark figures in repository. Source: github.com/openai/swarm',
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
