# SANITIZER.md — Operational File Sanitization Pipeline

> v1.0 · 2026-06-12 · AgentCV v4.1 addendum §4 · Design authority: this
> document. Owner: coding agent. Gate: Laplace + HJ browser pass before
> any sanitization UI ships to production.

---

## 1. Purpose

Agents and teams on AgentCV may publish their operational markdown files
(CLAUDE.md, AGENTS.md, SOUL.md, LESSONS.md, rules/ and similar) as
read-only rendered evidence of their design. These files originate as
private working documents. They routinely contain secrets, PII, and
business-confidential references that must be removed or generalized
before public display.

This document specifies the sanitization pipeline: detection, review,
masking, gating, logging, and honest disclosure. It is the design
reference for the coding agent implementing the feature, not a user guide.

**Fail-closed contract:** every gate in this pipeline defaults to BLOCKED.
A file is private until all findings are resolved. Errors during scanning
block rather than skip.

---

## 2. Threat Model

**Who is protected, from what:**

| Actor exposed                        | Protected from                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Operator's clients/partners          | Names, contact details, deal terms appearing in LESSONS.md or rule files leaking when files go public            |
| Operator themselves                  | API keys, service tokens, credentials embedded in CLAUDE.md or config files being exposed to the public internet |
| Third parties mentioned incidentally | Phone numbers, emails, or identity numbers of individuals referenced in operational notes becoming searchable    |
| The platform                         | Hosting content that contains plaintext credentials, which is a liability regardless of whose they are           |

**Explicit non-goals of this threat model:**

- Detecting secrets in rendered metadata fields (name, tagline, etc.) — those are separate input validation concerns
- Preventing deliberate re-identification from aggregated public data
- Replacing legal review of confidentiality obligations

---

## 3. Research Grounding

### 3.1 Secrets detection: gitleaks ruleset

Source: gitleaks/gitleaks config/gitleaks.toml, fetched 2026-06-12 via
GitHub API from `github.com/gitleaks/gitleaks` (master branch, minVersion
v8.25.0). The config contains 280+ named rules.

**Rule classes relevant to markdown operational files:**

| Class                             | Examples                                                                                                                                           | Detection method                                      | Entropy threshold          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------- |
| Provider-prefixed API keys        | `sk-ant-api03-…` (Anthropic), `sk-…` (OpenAI), `AKIA…`/`ASIA…` (AWS), `ghp_`/`ghs_`/`gho_` (GitHub), `xoxb-`/`xoxp-` (Slack), `dapi…` (Databricks) | Regex on fixed prefix + character class               | 3.0–4.5 depending on rule  |
| Generic high-entropy assignments  | `api_key = <value>`, `secret = <value>`, `token = <value>`, `password = <value>`                                                                   | Context keyword + assignment operator + value entropy | 3.5 (generic-api-key rule) |
| Private key blocks                | `-----BEGIN … PRIVATE KEY-----` PEM blocks                                                                                                         | Regex on PEM header/footer                            | 3.0                        |
| JWT tokens                        | `ey…` base64url-encoded JWTs                                                                                                                       | Regex on ey prefix structure                          | 3.0                        |
| Webhook URLs with embedded tokens | Slack webhook URLs, Teams webhook URLs                                                                                                             | Regex on known URL patterns                           | 3.0                        |

**Shannon entropy thresholds used by gitleaks (firsthand, from toml):**

- Most provider-specific rules: 2.0–3.5 (pattern is already highly
  specific, so entropy supplements rather than leads)
- Generic-api-key (catch-all): **3.5** — the highest catch-all threshold
- Private-key rule: **3.0** (the PEM structure already constrains it)
- TruffleHog's `--filter-entropy` docs suggest starting at **3.0** for
  unverified matches
- Industry practice: base64 strings ≥3.5 Shannon entropy are suspicious;
  hex strings ≥3.0 Shannon entropy are suspicious

**What is portable to pure JS regex + entropy scoring:**

All regex-based rules port directly. Shannon entropy calculation in JS is
~10 lines (character frequency over the candidate string). The
generic-api-key pattern requires: (a) a context keyword regex, (b) an
assignment operator lookahead, (c) value extraction, (d) entropy check
against 3.5 threshold. This is pure string operations — no dependencies.

### 3.2 PII detection: Presidio recognizer catalog

Source: `microsoft.github.io/presidio/supported_entities/` fetched
2026-06-12. Presidio provides 70+ entity types.

**Pure-JS achievable (pattern + context + checksum; no NER model required):**

| Entity                                       | Detection method                                                            | Checksum                                                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| EMAIL_ADDRESS                                | RFC-822 pattern + validation                                                | No (structure-based)                                                                                     |
| PHONE_NUMBER                                 | Pattern + context words + libphonenumber-equivalent logic                   | No                                                                                                       |
| CREDIT_CARD                                  | Pattern (13–16 digits, card prefixes) + Luhn checksum                       | Yes — Luhn                                                                                               |
| IBAN_CODE                                    | Pattern (country code + length) + MOD-97 checksum                           | Yes — MOD-97                                                                                             |
| IP_ADDRESS                                   | Pattern (IPv4 / IPv6) + range validation                                    | No (structure-based)                                                                                     |
| CRYPTO                                       | Pattern (BTC/ETH address formats) + checksum                                | Yes                                                                                                      |
| URL                                          | Pattern + TLD validation                                                    | No                                                                                                       |
| DATE_TIME                                    | Pattern (ISO 8601, common date formats)                                     | No                                                                                                       |
| US_SSN                                       | Pattern (###-##-####) + context words                                       | No                                                                                                       |
| KR_RRN (Korean Resident Registration Number) | Pattern (YYMMDD-S######, 13 digits) + checksum (weighted sum mod 11 mod 10) | Yes — RRN checksum. Note: post-Oct 2020 numbers have randomized last 3 digits; checksum may not validate |

Luhn algorithm: sum of doubled alternating digits from right, subtract 9
if >9, total must be divisible by 10. 10 lines of JS, no dependencies.

MOD-97 IBAN: rearrange first four chars to end, convert letters A=10…Z=35,
compute integer mod 97, result must equal 1. For long IBANs, process in
9-digit chunks to avoid integer overflow. ~15 lines of JS.

KR RRN checksum: `m = (11 - ((2a+3b+4c+5d+6e+7f+8g+9h+2i+3j+4k+5l) mod
11)) mod 10` where a–l are the first 12 digits. ~8 lines of JS.

**NOT achievable without an NER model, and what the design does instead:**

| Entity                                     | Why not achievable                                                                               | Compensation                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERSON (free-text name)                    | Requires NER to distinguish "John Smith" from "North Smith Ave" or "Smith & Wesson"              | Review UI flags suspicious noun phrases near PII context words; owner maintain-able deny-list of specific names; disclosure copy states the limit |
| LOCATION (physical address)                | Mixed pattern + NER; pure regex catches US addresses poorly, international addresses very poorly | Proximity heuristic: street number + road keyword patterns at medium confidence only; rely on disclosure + review                                 |
| NRP (Nationality/Religion/Political group) | Depends on language model context                                                                | Not attempted; disclosure states it                                                                                                               |
| Medical entities                           | Requires HuggingFace transformer models                                                          | Not in scope for operational markdown files                                                                                                       |

### 3.3 Business-confidential references: prior art

No off-the-shelf detector for this class exists as open-source tooling.
Prior art consulted:

**Microsoft Purview Sensitive Information Types** (M365 DLP):
`learn.microsoft.com/en-us/microsoft-365/compliance/sensitive-information-type-learn-about`,
fetched 2026-06-12. Key design pattern: **primary element + supporting
element within a proximity window + confidence level.** Their proximity
window is 250 characters. Confidence rises when supporting elements (context
keywords) co-occur near the primary pattern. This is the authoritative prior
art for the proximity-based business-confidential detector design below.

**gitleaks keyword proximity:** assignment-operator proximity within the
same line (keyword → operator → value). Used for the generic secrets rule.

**Pattern:** combine a primary signal (currency amount, codename-shaped
token) with supporting signals (deal/contract vocabulary within N chars).
Confidence tiers map to blocking vs. advisory severity.

---

## 4. Pipeline Design

```
File content (markdown)
    │
    ▼
┌─────────────────────────────────────┐
│  Stage 1: PARSE                     │
│  Split into segments:               │
│  - code blocks (fenced/indented)    │
│  - inline code spans                │
│  - prose (everything else)          │
│  Each segment carries: type, offset │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 2: DETECT (per segment)      │
│  2a. Secrets detector               │
│  2b. PII pattern detector           │
│  2c. Confidential heuristic         │
│  Detectors run in parallel over     │
│  segments; code blocks scanned for  │
│  secrets only (not PII/confidential)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 3: FINDINGS                  │
│  Normalise: type, severity, span,   │
│  excerpt (±20 chars), mask token,   │
│  detector_id, detector_version      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 4: REVIEW UI CONTRACT        │
│  Per finding: mask / edit-mask /    │
│  dismiss-with-reason (secrets:      │
│  typed justification required)      │
│  All findings must be resolved      │
│  before publish gate opens          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 5: PUBLISH GATE              │
│  BLOCKED if: any unresolved finding │
│  OR scan error OR scan not run yet  │
│  ALLOWED only when: scan completed  │
│  without error AND all findings     │
│  have status = masked | dismissed   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 6: CONTENT VERSION           │
│  Apply mask spans → new content     │
│  version. Original retained         │
│  privately. Published version stores│
│  masked content only.               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Stage 7: SANITIZATION LOG          │
│  Immutable per-file log entry:      │
│  scan_ts, detector_versions,        │
│  findings[], resolutions[], who     │
└─────────────────────────────────────┘
```

**Re-scan trigger:** any content change (new upload or edit) sets
`sanitization_state = 'needs_scan'` and `visibility = 'private'`
automatically. The publish gate re-checks. This is non-negotiable:
content changes can introduce new secrets.

**Scan errors fail closed:** if any detector throws, the file state is
`scan_error` and remains private. The error is surfaced in the review UI
with the specific detector that failed.

---

## 5. Detector Specifications

### 5.1 Secrets Detector

**Scope:** all segments including code blocks (secrets in code are still
secrets).

**Detection logic (three sub-passes):**

**5.1.1 Provider-prefix rules (highest precision)**

Match against a curated set of fixed-prefix regexes derived from the
gitleaks ruleset. These fire on pattern alone without entropy check because
the prefix is already highly specific.

Priority rules for operational markdown (these appear in real agent files):

```
anthropic:      /\bsk-ant-(?:api03|admin01)-[a-zA-Z0-9_\-]{93}AA\b/
openai:         /\bsk-(?:proj-)?[a-zA-Z0-9]{48,}\b/  (with entropy ≥ 3.0)
aws-access-key: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/
github-pat:     /\bghp_[a-zA-Z0-9]{36}\b/
github-fine:    /\bgithub_pat_[a-zA-Z0-9_]{82}\b/
github-app:     /\b(?:ghs_|gho_)[a-zA-Z0-9]{36}\b/
slack-bot:      /\bxoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}\b/
slack-user:     /\bxoxp-[0-9]+-[0-9]+-[0-9]+-[a-f0-9]+\b/
slack-webhook:  /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/
pem-private-key: /-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----[\s\S-]{64,}?KEY(?: BLOCK)?-----/
jwt:            /\bey[a-zA-Z0-9_-]{17,}\.ey[a-zA-Z0-9_\-\/]{17,}\.[a-zA-Z0-9_\-]+\b/
databricks:     /\bdapi[a-f0-9]{32}(?:-\d)?\b/
```

**5.1.2 Generic high-entropy assignment (medium precision)**

Pattern: context keyword → assignment operator → high-entropy value.

```
context keywords: access, api, auth, credential, creds, key, password,
                  passwd, secret, token (case-insensitive)
assignment operators: = > : := || => ?= ,
value pattern: [\w.=\-]{10,150} or [a-z0-9][a-z0-9+\/]{11,}={0,3}
entropy threshold: Shannon ≥ 3.5 over the value string
character sets for entropy: base64 chars [a-zA-Z0-9+/=], hex [a-f0-9]
```

Shannon entropy implementation (pure JS):

```
H(s) = -Σ (count(c)/len * log2(count(c)/len)) for each unique char c in s
```

Implemented as a ~10-line pure function over the extracted value token.

**5.1.3 Connection strings with credentials**

```
pattern: /(?:postgres|mysql|mongodb|redis|amqp):\/\/[^:@\s]+:[^@\s]{6,}@/i
purpose: database and message-broker URLs with embedded passwords
```

**Severity:** CRITICAL — never publishable unmasked. Dismiss requires a
typed justification (minimum 20 characters). The UI copy explains why.

---

### 5.2 PII Pattern Detector

**Scope:** prose segments only (code blocks excluded — a code example
containing `email@example.com` should not block publication of a tutorial).

**5.2.1 Email address**

```
pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/
validation: TLD must be ≥2 chars, local part non-empty
false positive handling: common placeholder patterns (user@example.com,
  test@test.com, no-reply@*) are auto-dismissed with a note
```

**5.2.2 Phone number (international)**

```
pattern: multiple patterns covering:
  E.164:      /\+[1-9]\d{6,14}\b/
  US/CA:      /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
  KR:         /\b(?:010|011|016|017|018|019)-?\d{3,4}-?\d{4}\b/
context boost: score increases when within 100 chars of words
  (phone, tel, mobile, call, contact, 전화, 연락처, 핸드폰)
minimum length: 7 digits after stripping formatting
```

**5.2.3 Credit card**

```
pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|
          6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/
validation: Luhn checksum (see §3.2)
note: masked as [credit-card]
```

**5.2.4 IBAN**

```
pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}(?:[A-Z0-9]?){0,16}\b/
validation: MOD-97 checksum (see §3.2)
note: 89-country coverage; not applicable in US/CA/AU/NZ contexts but
  scan runs globally
```

**5.2.5 IP address**

```
IPv4: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/
IPv6: standard pattern
range validation: flag private ranges (10.x, 172.16-31.x, 192.168.x) as
  [internal-ip] rather than [ip-address] — a different sensitivity tier
```

**5.2.6 Korean Resident Registration Number (RRN)**

```
pattern: /\b\d{6}-[1-4]\d{6}\b/
validation: RRN checksum for pre-Oct-2020 numbers (see §3.2)
note: post-Oct-2020 numbers have randomized digits; the pattern still
  fires on structure; the checksum validates older numbers only. Always
  flag regardless — the format is unambiguously an RRN.
```

**Severity:** BLOCKING — cannot publish unmasked. Can be dismissed with
a reason (false-positive friendly: a LESSONS.md might legitimately show an
example email format in a tutorial context).

---

### 5.3 Business-Confidential Heuristic Detector

**Scope:** prose segments only.

This detector has no off-the-shelf equivalent. The design follows
Microsoft Purview's primary-element + supporting-element + proximity model
(see §3.3), adapted to the operational markdown context.

**5.3.1 Owner deny-list (highest priority)**

Each owner account maintains a confidential-terms list: client names,
partner names, project codenames, internal product names. Terms are stored
encrypted at rest (SQLite with application-level AES-256 encryption on the
`owner_confidential_terms` table — implementation note: use Node's built-in
`crypto` module, AES-256-GCM). At scan time, these terms are loaded and
matched case-insensitively as whole-word patterns.

This is the primary compensation for the NER gap (§3.2): the operator who
knows their clients' names enters them; the scanner enforces them.

**5.3.2 Deal/contract language proximity**

Primary elements: **currency amounts only** — these are the tokens that get
masked as `[amount]`.

```
currency amounts:  /\$[\d,]+(?:\.\d{2})?(?:[KkMmBb])?|\b\d+(?:\.\d+)?\s*(?:USD|KRW|EUR|GBP)\b/
```

Supporting elements (within 250-character window — increase confidence but
are NOT themselves masked by this sub-pass):

```
deal terms:          contract, NDA, non-disclosure, agreement, SLA, retainer,
                     invoice, payment, deliverable, milestone, scope, SOW,
                     statement of work, engagement, confidential, proprietary
counterparty roles:  client, customer, partner, vendor, contractor, agency
```

**Span contract:** A finding from this sub-pass spans exactly the currency
amount token (e.g. `$40,000`). Counterparty role words are supporting context
only; they increase the confidence level of a nearby currency amount but do not
generate their own findings. This prevents the "misplaced mask" failure mode
where a role word like "client" was incorrectly flagged as `[amount]`.

Confidence levels (following Purview's model):

- **Low (advisory):** currency amount found but no supporting element in
  window → logged, shown in review UI as low-severity advisory, not blocking
- **Medium (blocking-dismissible):** currency amount + one supporting
  element in 250-char window → blocking, dismissible with reason
- **High (blocking):** currency amount + two or more supporting elements
  → blocking, requires reason to dismiss

**5.3.3 Counterparty-name detection**

Detects capitalized proper-noun sequences near counterparty context words —
the "cold-start" complement to the deny-list. When a client name is not yet
in the owner's deny-list, this sub-pass provides a catch based on naming
shape and linguistic proximity.

**Algorithm:**

1. Find all counterparty context words (client|customer|partner|vendor|account|agency) in the segment.
2. Find all capitalized proper-noun sequences (1–3 consecutive `[A-Z][a-z]+` words) in the segment.
3. For each proper-noun sequence, check whether it falls within ±60 characters of any context word.
4. If yes, and the sequence is not in the common-word stoplist, emit a `confidential.counterparty-name` finding with suggested mask `[client]`.

**Stoplist:** Common English words that happen to be title-cased (The, This,
Our, January, Monday, Report, Summary, etc.) are excluded. The full stoplist
is approximately 60 entries; see `src/lib/sanitizer/detectors/confidential.ts`.

**Scope exclusion:** Code block segments are skipped entirely (same as all
other sub-passes).

**Deduplication:** The `seen` set (keyed on `spanStart`) ensures that if both
the deny-list and the counterparty-name sub-pass fire on the same token (e.g.
"Initech" was added to the deny-list AND matches the proper-noun heuristic),
only the deny-list finding is kept. Sub-pass priority: deny-list →
deal-proximity → counterparty-name → internal-url.

**Known false-positive rate:** Moderate. Product names, feature names,
and proper nouns in technical writing that happen to appear near a role word
will fire. The review UI dismiss-with-reason is the safety valve; after a few
dismissals the owner typically adds a more precise deny-list term or adjusts
the probe content. This is by design: the heuristic errs on the side of
disclosure prevention.

**5.3.4 Internal URL / hostname detection**

```
internal indicators:
  - private IP ranges: 10.x, 172.16-31.x, 192.168.x, ::1
  - .internal, .local, .corp, .intranet TLDs
  - hostnames without dots (bare hostnames like "redis", "postgres")
  - URLs with port numbers on non-standard ports in non-public ranges
pattern: extract all URLs (href, bare URLs in prose), check against above
```

Severity: BLOCKING (internal URLs reveal infrastructure topology; an
unintentional `.internal` hostname leaks more than it appears to).

**5.3.5 Cold-start coverage**

The deny-list is empty for new accounts. Mitigation:

1. The onboarding UI for file upload prompts: "Add confidential terms
   before scanning" with examples (client names, project codenames).
2. The disclosure copy (§8) states explicitly that the business-confidential
   detector relies on your deny-list and will miss terms you have not entered.
3. **Medium-confidence proximity heuristics (§5.3.2) fire even without the deny-list** — currency amounts near deal vocabulary are still caught.
4. **The counterparty-name heuristic (§5.3.3) provides additional cold-start coverage** — proper-noun sequences near role words are flagged for owner review even before the deny-list is populated.

**Severity:** BLOCKING but dismissible with reason (false-positive rate is
higher here than for secrets/PII — a dollar amount in a lesson about cost
optimization should not permanently block publication).

---

## 6. Mask Token Grammar

Masks generalize while preserving the pattern. The reader understands the
document structure; the sensitive value is gone.

**Standard mask tokens:**

| Detected type                               | Mask token        |
| ------------------------------------------- | ----------------- |
| Email address                               | `[partner-email]` |
| Phone number                                | `[phone]`         |
| API key / secret / token                    | `[api-key]`       |
| Private key (PEM)                           | `[private-key]`   |
| Credit card                                 | `[credit-card]`   |
| IBAN                                        | `[iban]`          |
| IP address (public)                         | `[ip-address]`    |
| IP address (private)                        | `[internal-ip]`   |
| Currency amount                             | `[amount]`        |
| Client / counterparty name (from deny-list) | `[client]`        |
| Partner name (from deny-list)               | `[partner]`       |
| Project codename (from deny-list)           | `[codename]`      |
| Internal URL / hostname                     | `[internal-url]`  |
| JWT token                                   | `[jwt]`           |
| Webhook URL                                 | `[webhook-url]`   |

**Numbering rule:** when multiple distinct entities of the same type appear
in a file, they are numbered to preserve structural pattern:

```
Original: "We work with Acme Corp and WidgetCo..."
Masked:   "We work with [client-1] and [client-2]..."
```

Numbering is per-entity-type within a file, assigned in order of first
appearance. Numbering resets per file (not per owner across files). The
same entity appearing multiple times gets the same number (requires
tracking seen values → number mapping during the masking pass; the original
value is stored in the finding, so this mapping is computable from the
`file_findings` table).

**The owner may edit the mask token during review** (e.g., change
`[client-1]` to `[retailer-client]` for more informative public text).
The edited token replaces the auto-generated one in the published version.
The constraint: the mask token must match the pattern `\[[a-z][a-z0-9\-]*\]`
(no raw values allowed as custom mask tokens — UI enforces this).

**Masking is span-replacement:** the sanitizer records `{start, end,
mask_token}` tuples per finding. The published content version applies
them in reverse order (end→start) to avoid offset drift. The original
content is never modified; only the published version is masked.

---

## 7. Review UI Contract

The review UI presents each finding as a card with:

- Type badge (SECRETS / PII / CONFIDENTIAL) + severity badge
- Excerpt: 40 characters of context around the detected span (not the
  full value — the value is masked even in the review UI for secrets)
- Suggested mask token (editable for CONFIDENTIAL and PII)
- Three actions:

| Action               | Available for                                 | Behavior                                                                                                                                                                |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mask**             | All types                                     | Accept the suggested (or edited) mask token; finding status → `masked`                                                                                                  |
| **Edit mask + Mask** | PII, CONFIDENTIAL                             | Free-edit the mask token text, then mask                                                                                                                                |
| **Dismiss**          | PII (with reason), CONFIDENTIAL (with reason) | Finding status → `dismissed`; requires a non-empty reason string                                                                                                        |
| **Dismiss**          | SECRETS                                       | Allowed but requires typed justification ≥ 20 chars; the UI shows a warning: "This finding may be a real credential. Dismissing it will publish this content unmasked." |

**Publish gate rule (explicit):**

```
canPublish(file) =
  file.scan_completed === true
  AND file.scan_error === null
  AND file.findings.every(f => f.status === 'masked' || f.status === 'dismissed')
```

If `canPublish` is false for any reason, the visibility toggle is disabled
in the UI with a clear reason label. The API route for `PATCH
/api/files/:id/visibility` enforces this server-side independently of the
UI — the UI check is UX convenience, not the security boundary.

**Re-scan on content change:**

When file content is updated (PUT /api/files/:id), the server:

1. Sets `sanitization_state = 'needs_scan'`
2. Sets `visibility = 'private'` (even if it was already public)
3. Marks all prior findings as `stale`
4. Runs the scanner synchronously (files are expected to be ≤50 KB; async
   scanning is not required at this scale)
5. Updates `sanitization_state` to `'scan_complete'` or `'scan_error'`

Visibility does not auto-restore after re-scan even if zero new findings
are found. The owner must explicitly re-publish. This is intentional:
the content changed, the owner should confirm. This is the fail-closed
rule for mutations.

---

## 8. Sanitization Log Schema

The log is append-only and immutable from the application layer. No UPDATE
or DELETE on `file_scan_log` rows.

```sql
-- Operational files attached to agents or teams.
CREATE TABLE files (
  id          INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('agent','team')),
  subject_id  INTEGER NOT NULL,
  path        TEXT NOT NULL,          -- e.g. "CLAUDE.md", "rules/anti-hallucination.md"
  content_private TEXT NOT NULL,      -- original content, never exposed publicly
  content_public  TEXT,               -- masked version; NULL until first publish
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  sanitization_state TEXT NOT NULL DEFAULT 'needs_scan'
    CHECK (sanitization_state IN ('needs_scan','scan_complete','scan_error')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subject_type, subject_id, path)
);

-- One row per finding per scan run. Prior-scan findings marked stale on re-scan.
CREATE TABLE file_findings (
  id            INTEGER PRIMARY KEY,
  file_id       INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  scan_log_id   INTEGER NOT NULL REFERENCES file_scan_log(id),
  detector_id   TEXT NOT NULL,        -- e.g. "secrets.provider-prefix.anthropic"
  detector_version TEXT NOT NULL,     -- semver of the detector ruleset
  finding_type  TEXT NOT NULL CHECK (finding_type IN ('secret','pii','confidential')),
  severity      TEXT NOT NULL CHECK (severity IN ('critical','blocking','advisory')),
  span_start    INTEGER NOT NULL,     -- byte offset in content_private
  span_end      INTEGER NOT NULL,
  excerpt       TEXT NOT NULL,        -- ±20 chars context; value itself masked here too
  suggested_mask TEXT NOT NULL,       -- auto-generated mask token
  status        TEXT NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved','masked','dismissed','stale')),
  resolved_mask TEXT,                 -- final mask token (may differ from suggested)
  dismiss_reason TEXT,                -- required when status='dismissed' for secrets
  resolved_by   INTEGER REFERENCES users(id),
  resolved_at   TEXT,
  stale         INTEGER NOT NULL DEFAULT 0  -- 1 when superseded by a newer scan
);
CREATE INDEX idx_file_findings_file ON file_findings(file_id, stale, status);

-- Immutable scan log. One row per scan run per file.
CREATE TABLE file_scan_log (
  id              INTEGER PRIMARY KEY,
  file_id         INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  scan_ts         TEXT NOT NULL DEFAULT (datetime('now')),
  detector_versions TEXT NOT NULL,   -- JSON: {"secrets": "1.0.0", "pii": "1.0.0", "confidential": "1.0.0"}
  finding_count   INTEGER NOT NULL,
  error_message   TEXT,              -- NULL on success
  triggered_by    TEXT NOT NULL CHECK (triggered_by IN ('content_change','manual_rescan','visibility_attempt'))
);
CREATE INDEX idx_file_scan_log_file ON file_scan_log(file_id, scan_ts DESC);
```

**Retention:** scan log rows are never deleted. If a file is deleted, its
scan log is CASCADE-deleted (acceptable; the file itself is gone). Findings
older than the most recent non-stale scan are marked `stale = 1` but
retained for audit history.

---

## 9. Honest Limits and Disclosure Copy

### 9.1 What the scanner will miss

1. **Free-text person names** — without an NER model, names like "James
   from Acme" are not detected. The deny-list compensates for known names
   the operator enters; unknown third-party names are not caught.

2. **Shannon entropy false negatives** — a secret that happens to have low
   character diversity (e.g., a key consisting of repeated patterns) will
   score below the entropy threshold. Provider-prefix rules are more
   reliable; entropy is a catch-all supplement.

3. **Business context without context words** — if a confidential dollar
   amount appears without any of the supporting-element keywords in the
   proximity window, the low-confidence advisory fires but may be dismissed
   silently.

4. **Secrets inside code block examples** — code blocks are scanned for
   secrets (§5.1), but if a LESSONS.md contains a code example with a
   deliberately fake-looking key (e.g., `sk-ant-api03-EXAMPLE…`) it will
   still fire. The operator dismisses with reason; this is expected behavior.

5. **New secret formats** — the provider-prefix ruleset tracks gitleaks'
   master branch at the time of the `detector_version` build. New API key
   formats from providers not yet in the ruleset are missed. The scanner
   version is logged; operators can trigger a manual rescan after a ruleset
   update.

6. **KR RRN post-Oct 2020** — randomized last 3 digits mean the checksum
   does not validate newer numbers. The structural pattern still fires; the
   absence of checksum validation means higher false-positive rate on
   9-digit sequences that happen to match the YYMMDD-S prefix.

### 9.2 Disclosure copy shown at publish time

The following text is shown in the publish confirmation modal and is
permanently visible on any publicly-viewable file:

> "This file was scanned for secrets, personal information, and
> confidential business references before publication. Automated scanning
> assists but does not guarantee that all sensitive content has been
> identified. Person names and some location references are not
> automatically detected. You are responsible for reviewing this file
> before making it public."

This copy is non-negotiable and must appear verbatim or with only editorial
smoothing (no weakening). It is part of the honesty architecture.

---

## 10. Implementation Notes for the Coding Agent

### 10.1 Module boundaries

```
src/lib/sanitizer/
  index.ts          — runScan(fileId, triggeredBy): ScanResult; entry point
  parser.ts         — parseMarkdownSegments(content): Segment[]
  detectors/
    secrets.ts      — detectSecrets(segments): Finding[]
    pii.ts          — detectPii(segments): Finding[]
    confidential.ts — detectConfidential(segments, denyList): Finding[]
  entropy.ts        — shannonEntropy(s: string): number
  masks.ts          — applyMasks(content, findings): string; buildMaskToken(type, entityIndex): string
  rules.ts          — PROVIDER_PREFIX_RULES: Rule[]; versioned export
```

### 10.2 SQLite tables summary

Three new tables required (see §8 for full DDL):

- `files` — the file records with content and state
- `file_findings` — per-finding rows, linked to scan log
- `file_scan_log` — immutable audit log per scan run

Schema version bump required (currently v5 → v6). The existing
drop-and-rebuild seeding strategy applies (data/ is disposable).

### 10.3 Key implementation constraints

- **No external services.** All detection runs in-process (Node.js). No
  HTTP calls during a scan. The scanner must complete synchronously within
  the request cycle for files ≤50 KB.
- **No Python.** No Presidio service. No Docker. Pure TypeScript/JS only.
- **Zero dependencies preferred.** The entropy function, Luhn, MOD-97,
  and RRN checksum are all ≤20 lines each. The gitleaks-derived regex rules
  are plain JS RegExp objects. A single optional dependency on a
  phone-number normalization library (e.g., `google-libphonenumber` or a
  lightweight fork) is acceptable for phone detection quality.
- **TypeScript strict.** No `any`. The `Finding`, `Segment`, `ScanResult`
  types must be fully typed. Detectors accept `Segment[]` and return
  `Finding[]` with no side effects.
- **Content at rest.** `content_private` is never sent to the public API.
  The public API serves `content_public` only. Server-side rendering of
  the file viewer must route through a server component or API route that
  checks visibility and authentication before returning content.
- **Deny-list encryption.** Owner confidential terms are sensitive. Use
  Node's built-in `crypto` module (AES-256-GCM) with the `SANITIZER_KEY`
  env var (separate from AUTH_SECRET). Key must be documented in docs/AUTH.md
  as an `[[HJ ACTION]]` for production.

### 10.4 API routes needed

```
GET  /api/files/:id           — file metadata + findings (no content_private)
PUT  /api/files/:id           — update content → triggers rescan
PATCH /api/files/:id/visibility — flip to public (enforces canPublish gate)
POST /api/files/:id/findings/:findingId/resolve — mask or dismiss
POST /api/files/:id/rescan    — manual rescan trigger
GET  /api/owners/:handle/confidential-terms — list terms (authenticated, owner only)
POST /api/owners/:handle/confidential-terms — add term
DELETE /api/owners/:handle/confidential-terms/:id — remove term
```

### 10.5 Ruleset versioning

Export `DETECTOR_VERSION` from each detector module. The scan log records
these versions as a JSON object. When rules are updated, the version bumps
and the operator can manually trigger re-scans of existing files (a
migration script or a UI "re-scan all" option — roadmap).

---

## 11. Decision Record (load-bearing choices)

| #   | Decision                                                          | Reasoning                                                                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fail closed on scan error                                         | An error means uncertainty, not safety. Blocking is the only correct default; openness-on-error would silently expose files when the scanner crashes.                                                                                                |
| 2   | Visibility auto-reverts on content change                         | A file that passed review yesterday may contain new secrets today. Manual re-confirm is the safe default; auto-restore would remove the operator's attention from the review step.                                                                   |
| 3   | Code blocks scanned for secrets but NOT for PII/confidential      | Secrets in code are still live credentials. But example emails and deal-language in tutorial code are expected noise — scanning prose only for PII/confidential dramatically reduces false-positive rate without meaningfully reducing protection.   |
| 4   | Proximity window 250 chars for confidential heuristic             | Direct adoption of Microsoft Purview's proven proximity value. It captures co-occurrence within a paragraph without false-positives from accidentally nearby text across headings.                                                                   |
| 5   | Dismiss-with-typed-justification for secrets (not outright block) | A LESSONS.md might legitimately discuss a revoked key as an example. Blocking all dismissal creates false safety; requiring a typed justification creates an audit trail and raises the friction enough to prevent casual dismissal of real secrets. |

---

## 12. References

1. gitleaks/gitleaks configuration: `github.com/gitleaks/gitleaks` master
   branch `config/gitleaks.toml` — fetched 2026-06-12 via GitHub API.
   Primary source for all provider-prefix regexes and entropy thresholds.

2. Microsoft Presidio supported entities:
   `microsoft.github.io/presidio/supported_entities/` — fetched 2026-06-12.
   Primary source for PII entity catalog, detection method classification,
   and checksum-based validators.

3. Microsoft Purview Sensitive Information Types:
   `learn.microsoft.com/en-us/microsoft-365/compliance/sensitive-information-type-learn-about`
   — fetched 2026-06-12. Primary prior art for the primary-element +
   supporting-element + proximity-window design (§5.3.2). Proximity value
   of 250 characters adopted directly.

4. Korean Resident Registration Number:
   `en.wikipedia.org/wiki/Resident_registration_number` — fetched 2026-06-12.
   Checksum formula: `m = (11 - ((2a+3b+4c+5d+6e+7f+8g+9h+2i+3j+4k+5l) mod 11)) mod 10`.

5. IBAN MOD-97 checksum: `en.wikipedia.org/wiki/IBAN` — fetched 2026-06-12.
   Validation algorithm and JavaScript chunking approach for large IBANs.

6. Luhn algorithm: `en.wikipedia.org/wiki/Luhn_algorithm` — fetched 2026-06-12.
   Credit card checksum validation.

7. TruffleHog `--filter-entropy` starting value of 3.0:
   `github.com/trufflesecurity/trufflehog` README — fetched 2026-06-12.
   Corroborates the 3.0–3.5 range for entropy thresholds.

8. OWASP Free Security Tools listing of gitleaks and TruffleHog:
   `owasp.org/www-community/Free_for_Open_Source_Application_Security_Tools`
   — fetched 2026-06-12.

---

_What is NOT in this document:_ UI wireframes for the review modal (design
authority); production encryption key management (HJ action per §10.3);
the verification ladder for third-party attestation of scan completeness
(roadmap); handling of binary file attachments (out of scope — markdown
files only); multi-language NER integration (roadmap, requires a model
dependency decision).\*
