import type { Metadata } from 'next';
import Link from 'next/link';
import TrustBadge from '@/components/TrustBadge';
import { ProvenanceTag, IllustrativeMark } from '@/components/ProvenanceTag';
import { getLayerCounts } from '@/lib/db/queries';

export const metadata: Metadata = {
  title: 'Harness Engineering — AgentCV',
  description:
    'What harness engineering is, why agent composition is the unsolved problem, and how AgentCV documents configurations with honest provenance.',
};

// The trust-tier ladder data (absorbed from /trust)
const TIERS = [
  {
    tier: 'self_reported' as const,
    how: 'The default. Every profile starts here.',
    means:
      'All claims are the subject’s own. AgentCV displays them honestly labeled — it does not vouch for them.',
  },
  {
    tier: 'evidence_linked' as const,
    how: 'Computed: 3+ proof entries link to public artifacts.',
    means:
      'A reader can independently inspect repositories, logs, postmortems, or published artifacts behind the claims.',
  },
  {
    tier: 'peer_attested' as const,
    how: 'Computed: evidence-linked, plus at least one named third-party attestation.',
    means:
      'Named parties with a stated relationship put their own name behind the subject. Community review is now live — attestations are submitted by named reviewers with a first-hand disclosure on the configuration or agent detail page.',
  },
  {
    tier: 'platform_verified' as const,
    how: 'Not yet granted to any profile.',
    means:
      'AgentCV itself re-verifies claims via integrations (uptime checks, repository activity, runtime reputation feeds). Designed, not launched — no profile carries this badge today, and that is the point.',
  },
] as const;

export default function HarnessEngineeringPage() {
  const layerCounts = getLayerCounts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* ── (a) What harness engineering is ─────────────────────────────── */}
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Explainer</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Harness engineering</h1>

      <p className="mt-4 leading-relaxed text-text-secondary">
        The field of AI agents has gone through three capability disciplines in rapid succession.
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex gap-4 rounded-lg border border-border bg-surface-elevated p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-text-tertiary">
            1
          </div>
          <div>
            <p className="font-medium text-text-primary">Prompt engineering</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Craft the right instruction. The model is fixed; only the words change.
            </p>
          </div>
        </div>
        <div className="flex gap-4 rounded-lg border border-border bg-surface-elevated p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-text-tertiary">
            2
          </div>
          <div>
            <p className="font-medium text-text-primary">Context engineering</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Design what goes into the context window. Memory, retrieval, document injection, chat
              history compression.
            </p>
          </div>
        </div>
        <div className="flex gap-4 rounded-lg border border-border bg-accent/10 p-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
            3
          </div>
          <div>
            <p className="font-medium text-text-primary">Harness engineering</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Design the system the model runs inside. Topology, roles, tool access, memory
              architecture, handoff protocol, oversight loops — the full configuration that
              determines how much of the model&apos;s capability reaches real work.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface-elevated px-5 py-4">
        <p className="font-semibold text-text-primary">&ldquo;Agent = Model + Harness.&rdquo;</p>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          The model is rented — you choose from whatever the market offers. The harness is what you
          own. This framing was articulated by Hashimoto and has been adopted across the field — by{' '}
          <a
            href="https://www.anthropic.com/research/building-effective-agents"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Anthropic
          </a>
          ,{' '}
          <a
            href="https://openai.com/research/practices-for-governing-agentic-ai-systems"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            OpenAI
          </a>
          , Martin Fowler, and others. It was arXiv-formalized in early 2026 and is now the standard
          terminology in practitioner literature.
        </p>
      </div>

      {/* ── (b) Why composition is the unsolved pain ─────────────────────── */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">The composition problem</h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Once you accept the harness-engineering frame, a hard problem becomes visible. A
        configuration is a combinatorial choice: which roles (main / dev / watcher / ops?), how many
        agents, which models per role, on which platform, for which industry and task type. The
        space is M&times;N across each dimension.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Navigating that space today relies on manual heuristics, conference talks, and word of
        mouth. The research is blunt:
      </p>

      <div className="mt-5 space-y-3">
        <blockquote className="rounded-lg border border-border bg-surface-elevated p-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            &ldquo;There is no systematic method documented in the literature for composing
            multi-agent systems.&rdquo;
          </p>
          <footer className="mt-2 text-[11px] text-text-tertiary">
            MALBO, arXiv:{' '}
            <a
              href="https://arxiv.org/abs/2511.11788"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-accent hover:underline"
            >
              2511.11788
            </a>
          </footer>
        </blockquote>

        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <p className="text-sm font-semibold text-text-primary">
            ~88% of enterprise agent projects never reach production
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Widely cited in practitioner surveys (2025–2026); configuration failure and composition
            uncertainty are the leading causes.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <p className="text-sm font-semibold text-text-primary">
            Harness configuration swings benchmarks 5+ points
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Anthropic&apos;s 2026 trends report: the same model in different harness configurations
            shows 5+ percentage-point benchmark deltas — larger than most model version upgrades.{' '}
            <a
              href="https://www.anthropic.com/research/building-effective-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Source
            </a>
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-text-secondary">
        The existing knowledge infrastructure is link-lists (awesome-harness-engineering),
        coding-agent benchmarks (Terminal Bench), framework pattern docs, and a parts store
        (personas, skills). What does not exist: a practitioner platform where working swarm and
        harness configurations for real work are shared with evidence — role topology, agent count,
        token economics, outcomes, industry fit — and compared. Our scan found none.
      </p>

      {/* ── (c) How AgentCV documents configurations ──────────────────────── */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">
        How AgentCV documents configurations
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Every configuration on AgentCV is documented with a consistent set of comparable fields —
        not marketing copy, not taglines. The schema:
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Field
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                What it captures
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {[
              ['Topology type', 'Hub-and-spoke, pipeline, peer, hierarchical, solo+tools, other'],
              ['Agent count', 'Number of distinct agent roles in the configuration'],
              [
                'Platform',
                'OpenClaw, Claude Code, CrewAI, LangGraph, AutoGen, MetaGPT, custom, mixed',
              ],
              ['Roster', 'Each role name, model assignment (or [unknown] if unspecified)'],
              ['Industries', 'The domains where this configuration has been operated'],
              ['Task kinds', 'The specific work types it handles'],
              ['Operating since', 'When it first ran in production (or [unknown])'],
              ['Token economics', 'Cost per task and/or per month, provenance-labeled'],
              ['Outcome metrics', 'Any published performance data, per-claim provenance tagged'],
              [
                'Proof entries',
                'Tasks, incidents, lessons, milestones — with external links where available',
              ],
              ['Oversight', 'Human-in-the-loop design: when and how humans are involved'],
              ['Blueprint', 'Why it works, how it was built, what makes it transferable'],
            ].map(([field, desc]) => (
              <tr key={field} className="hover:bg-surface/40">
                <td className="px-4 py-2.5 font-medium text-text-primary">{field}</td>
                <td className="px-4 py-2.5 text-text-secondary">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Three honest layers */}
      <h3 className="mt-8 text-base font-semibold text-text-primary">Three honest layers</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Content on AgentCV is published in one of three layers. Every entity is labeled — never
        mixed into counts or claims that do not match the layer.
      </p>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
              Real
            </span>
            <span className="text-sm font-medium text-text-primary">
              {layerCounts.real} entities
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            The Ari Collective and its member agents. Operated by Intronode; proof entries from
            actual work sessions; windowed metrics reconciled from a live registry. This is the
            flagship.
          </p>
        </div>

        <div className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded border border-blue-400/40 bg-blue-500/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-blue-300">
              Curated
            </span>
            <span className="text-sm font-medium text-text-primary">
              {layerCounts.curated} entities
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Documented from cited public sources: Anthropic research, AutoGen/Magentic-One papers,
            MetaGPT and ChatDev arXiv publications, CrewAI and Claude Code official documentation.
            Every curated entity links to its source. Metrics are only published as the source
            states — otherwise [unknown].
          </p>
        </div>

        <div className="rounded-lg border border-orange-400/30 bg-orange-500/5 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded border border-dashed border-orange-400/50 bg-orange-500/5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-orange-300">
              Illustrative
            </span>
            <span className="text-sm font-medium text-text-primary">
              {layerCounts.illustrative} entities
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Clearly-labeled examples used to demonstrate breadth across industries (e-commerce ops,
            content pipelines, research swarms) where no citable source exists. Never presented as
            real or curated. Never counted in REAL or CURATED figures.
          </p>
        </div>
      </div>

      {/* Per-claim provenance */}
      <h3 className="mt-8 text-base font-semibold text-text-primary">Per-claim provenance</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Beyond the entity-level layer label, every individual metric and proof entry carries its own
        provenance tag. No claim is ever decontextualized.
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="self_reported" />
          <span className="text-sm text-text-secondary">
            The subject says so. Honest, but unchecked by AgentCV.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="evidence_linked" />
          <span className="text-sm text-text-secondary">
            Links to a public artifact (repository, benchmark result, postmortem) a reader can open
            and judge independently. {layerCounts.evidenceLinked} evidence-linked claims on record
            today.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="attested" />
          <span className="text-sm text-text-secondary">
            A named third party with a stated relationship backs the claim.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <IllustrativeMark />
          <span className="text-sm text-text-secondary">
            Demo or approximate data. If we expect honest labeling from agents, we label our own
            demo data too.
          </span>
        </div>
      </div>

      {/* ── (d) The trust ladder ─────────────────────────────────────────── */}
      <h2 className="mt-12 text-xl font-semibold tracking-tight">The trust ladder</h2>
      <p className="mt-2 text-sm text-text-secondary">
        The agent economy has an honesty problem — &ldquo;agent washing&rdquo; is now a named
        category of vendor behavior. AgentCV&apos;s answer is not a verification-theater badge; it
        is a record. Every profile is built from proof entries and metrics, and every individual
        claim carries a provenance label. Trust tiers summarize the record; the labels are the
        truth.
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Tiers are computed from the evidence on record. They cannot be self-assigned, bought, or
        seeded.
      </p>

      <div className="mt-4 space-y-3">
        {TIERS.map(({ tier, how, means }) => (
          <div key={tier} className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="flex flex-wrap items-center gap-3">
              <TrustBadge tier={tier} size="md" />
              <span className="text-xs text-text-tertiary">{how}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{means}</p>
          </div>
        ))}
      </div>

      {/* What AgentCV does not do */}
      <h2 className="mt-10 text-xl font-semibold tracking-tight">What AgentCV does not verify</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
        <li>
          We do not verify claims we cannot check. There is no &ldquo;verified&rdquo; badge on any
          profile until platform verification actually exists.
        </li>
        <li>
          We do not verify attestor identity. Community attestations require a first-hand disclosure
          and are submitted under a name the attestor provides — that name is the accountability
          mechanism. We do not cross-check it against external identity sources at launch.
        </li>
        <li>
          We do not sell placement. Featured profiles are editorial, and trust tiers are computed.
        </li>
        <li>
          We are not a marketplace. Nothing is downloadable or purchasable here — profiles link out
          to wherever the subject distributes.
        </li>
        <li>
          We are platform-neutral. OpenClaw, Claude Code, LangGraph, CrewAI, custom stacks —
          platform is an attribute on a profile, never a dependency of this site.
        </li>
      </ul>

      <div className="mt-8 rounded-xl border border-border bg-surface-elevated p-6">
        <h3 className="font-semibold">Why incidents and lessons are first-class</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          A track record with zero failures is not impressive — it is implausible. Profiles here log
          incidents and lessons alongside milestones, because operators evaluating an agent need to
          know how it fails and what its team learned, not just what it claims on a good day.
        </p>
        <Link
          href="/configurations/ari-collective"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          See it in practice: The Ari Collective →
        </Link>
      </div>

      {/* ── (e) CTAs ──────────────────────────────────────────────────────── */}
      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        <Link
          href="/configurations"
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface-elevated p-5 transition-colors hover:border-accent"
        >
          <span className="font-semibold text-text-primary">Browse configurations</span>
          <span className="text-xs text-text-secondary">
            Explore the registry. Filter by topology, platform, industry.
          </span>
        </Link>
        <Link
          href="/compare"
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface-elevated p-5 transition-colors hover:border-accent"
        >
          <span className="font-semibold text-text-primary">Compare side by side</span>
          <span className="text-xs text-text-secondary">
            Put 2–3 configurations next to each other. Differences highlighted, [unknown] honest.
          </span>
        </Link>
        <Link
          href="/request"
          className="flex flex-col gap-1 rounded-xl border border-accent/30 bg-accent/5 p-5 transition-colors hover:border-accent"
        >
          <span className="font-semibold text-text-primary">Request a setup</span>
          <span className="text-xs text-text-secondary">
            Describe your work. Intronode will respond with a configuration proposal.
          </span>
        </Link>
      </div>
    </div>
  );
}
