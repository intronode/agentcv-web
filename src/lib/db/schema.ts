// SQLite schema for AgentCV v4. Kept as a TS constant so the Next.js server
// bundle never needs filesystem access to a .sql file.

// Bump on any schema change: a seeded demo DB with an older version is
// dropped and rebuilt automatically on next access (data/ is disposable).
// v5: users table + owners.user_id for Auth.js v5 account ownership.
export const SCHEMA_VERSION = 5;

export const SCHEMA_SQL = `
PRAGMA user_version = ${SCHEMA_VERSION};

-- Human accounts (Auth.js v5, JWT strategy — no DB adapter needed for sessions)
-- email is nullable: dev sign-in creates users with no email.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  image TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  handle TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE owners (
  id INTEGER PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','org')),
  bio TEXT,
  website_url TEXT,
  -- nullable FK: set when a user claims or registers this owner profile.
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE agents (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🤖',
  tagline TEXT NOT NULL,
  about TEXT,
  category TEXT NOT NULL,
  platform TEXT NOT NULL,
  model TEXT,
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  lineage_kind TEXT NOT NULL DEFAULT 'original' CHECK (lineage_kind IN ('original','fork','instance')),
  lineage_of INTEGER REFERENCES agents(id),
  lineage_note TEXT,
  oversight TEXT,
  how_built TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','retired')),
  operational_since TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  seed_layer TEXT NOT NULL DEFAULT 'illustrative' CHECK (seed_layer IN ('real','curated','illustrative')),
  source_url TEXT,
  source_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- v4.1 "configurations" renamed to "teams" (conceptual reframe: the team
-- is the first-class unit; agents are components within it).
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🕸',
  kind TEXT NOT NULL DEFAULT 'team' CHECK (kind IN ('team','swarm')),
  tagline TEXT NOT NULL,
  about TEXT,
  topology TEXT,
  oversight TEXT,
  how_built TEXT,
  owner_id INTEGER NOT NULL REFERENCES owners(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','retired')),
  operational_since TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  -- v4 comparable fields (D3 benchmark schema)
  topology_type TEXT CHECK (topology_type IN ('supervisor','orchestrator_worker','swarm','pipeline','router','solo_plus_tools','other')),
  agent_count INTEGER,
  platform TEXT,
  industries TEXT,
  task_kinds TEXT,
  why_it_works TEXT,
  -- source layer (formalizes the v3 illustrative flag into three layers)
  seed_layer TEXT NOT NULL DEFAULT 'illustrative' CHECK (seed_layer IN ('real','curated','illustrative')),
  source_url TEXT,
  source_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- team_members: the role-to-model mapping for agents within a team.
-- role-to-model mapping is obtained via JOIN to agents.model -- no duplication needed.
CREATE TABLE team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  role_detail TEXT,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, agent_id)
);

CREATE TABLE proof_entries (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('agent','team')),
  subject_id INTEGER NOT NULL,
  entry_date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task','incident','lesson','milestone','artifact')),
  title TEXT NOT NULL,
  body TEXT,
  evidence_url TEXT,
  provenance TEXT NOT NULL DEFAULT 'self_reported' CHECK (provenance IN ('self_reported','evidence_linked','attested')),
  illustrative INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_proof_subject ON proof_entries(subject_type, subject_id, entry_date DESC);

-- metrics.value is nullable on purpose: an honest profile can state that a
-- number is unknown rather than invent one. note carries precise provenance
-- annotations (e.g. "[derived-from-registry, window-scoped]").
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('agent','team')),
  subject_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value REAL,
  unit TEXT NOT NULL DEFAULT 'count' CHECK (unit IN ('pct','count','ms','usd','days')),
  provenance TEXT NOT NULL DEFAULT 'self_reported' CHECK (provenance IN ('self_reported','evidence_linked','attested')),
  note TEXT,
  illustrative INTEGER NOT NULL DEFAULT 0,
  as_of TEXT NOT NULL,
  UNIQUE (subject_type, subject_id, key)
);

CREATE TABLE capabilities (
  id INTEGER PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 100),
  UNIQUE (agent_id, name)
);

CREATE TABLE attestations (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('agent','team')),
  subject_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_url TEXT,
  relationship TEXT NOT NULL,
  statement TEXT NOT NULL,
  illustrative INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contact_requests (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('agent','team','owner')),
  subject_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','closed')),
  kind TEXT NOT NULL DEFAULT 'general' CHECK (kind IN ('request_setup','claim','general')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
