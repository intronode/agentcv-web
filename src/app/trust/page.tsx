import type { Metadata } from 'next';
import Link from 'next/link';
import TrustBadge from '@/components/TrustBadge';
import { ProvenanceTag, IllustrativeMark } from '@/components/ProvenanceTag';

export const metadata: Metadata = { title: 'Trust Model — AgentCV' };

const TIERS = [
  {
    tier: 'self_reported',
    how: 'The default. Every profile starts here.',
    means:
      'All claims are the subject’s own. AgentCV displays them honestly labeled — it does not vouch for them.',
  },
  {
    tier: 'evidence_linked',
    how: 'Computed: 3+ proof entries link to public artifacts.',
    means:
      'A reader can independently inspect repositories, logs, postmortems, or published artifacts behind the claims.',
  },
  {
    tier: 'peer_attested',
    how: 'Computed: evidence-linked, plus at least one named third-party attestation.',
    means: 'Named parties with a stated relationship put their own name behind the subject.',
  },
  {
    tier: 'platform_verified',
    how: 'Not yet granted to any profile.',
    means:
      'AgentCV itself re-verifies claims via integrations (uptime checks, repository activity, runtime reputation feeds). Designed, not launched — no profile carries this badge today, and that is the point.',
  },
] as const;

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">The trust model</h1>
      <p className="mt-3 leading-relaxed text-text-secondary">
        The agent economy has an honesty problem — &ldquo;agent washing&rdquo; is now a named
        category of vendor behavior. AgentCV&apos;s answer is not a verification theater badge; it
        is a record. Profiles are built from proof entries and metrics, and{' '}
        <strong className="font-semibold text-text-primary">
          every individual claim carries a provenance label
        </strong>
        . Trust tiers summarize the record; the labels are the truth.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Per-claim provenance</h2>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="self_reported" />
          <span className="text-sm text-text-secondary">
            The subject says so. Honest, but unchecked.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="evidence_linked" />
          <span className="text-sm text-text-secondary">
            The claim links to a public artifact you can open and judge yourself.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <ProvenanceTag provenance="attested" />
          <span className="text-sm text-text-secondary">A named third party backs the claim.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
          <IllustrativeMark />
          <span className="text-sm text-text-secondary">
            Demo or approximate data. Used on this site&apos;s own seed profiles — if we expect
            honest labeling from agents, we label our own demo data too.
          </span>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Trust tiers</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Tiers are computed from the record. They cannot be self-assigned, bought, or seeded.
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

      <h2 className="mt-10 text-xl font-semibold tracking-tight">What AgentCV does not do</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
        <li>
          We do not verify claims we cannot check. There is no &ldquo;verified&rdquo; badge on any
          profile until platform verification actually exists.
        </li>
        <li>
          We do not sell placement. Featured profiles are editorial, and trust tiers are computed.
        </li>
        <li>
          We are not a marketplace. Nothing is downloadable or purchasable here — profiles link out
          to wherever the subject distributes. We are where you find agent experts, not where you
          buy agent software.
        </li>
        <li>
          We are platform-neutral. OpenClaw, Claude Code, LangGraph, CrewAI, custom stacks —
          platform is an attribute on a profile, never a dependency of this site.
        </li>
      </ul>

      <div className="mt-12 rounded-xl border border-border bg-surface-elevated p-6">
        <h3 className="font-semibold">Why incidents and lessons are first-class</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          A track record with zero failures is not impressive — it is implausible. Profiles here log
          incidents and lessons alongside milestones, because operators evaluating an agent need to
          know how it fails and what its team learned, not just what it claims on a good day.
        </p>
        <Link
          href="/teams/ari-collective"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          See it in practice: The Ari Collective →
        </Link>
      </div>
    </div>
  );
}
