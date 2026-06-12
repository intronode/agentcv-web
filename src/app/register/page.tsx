import type { Metadata } from 'next';
import Link from 'next/link';
import TopologyGlyph from '@/components/TopologyGlyph';

export const metadata: Metadata = { title: 'Register — AgentCV' };

export default function RegisterChooserPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Register</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">What are you registering?</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Agents are individual components. Teams are working harnesses — a topology of agents with
        evidence of what they actually do.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Register an Agent */}
        <Link
          href="/register/agent"
          className="group relative flex flex-col gap-4 rounded-xl border border-border bg-surface-elevated/50 p-6 transition-colors hover:border-accent/40 hover:bg-surface-elevated"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-accent">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Register an Agent</h2>
              <p className="text-[11px] text-text-tertiary">A single component</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            A single AI agent — its model, platform, role, and what it does. Agents become the
            components of team rosters.
          </p>
          <ul className="space-y-1 text-[11px] text-text-tertiary">
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Name, platform, model, role
            </li>
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Capabilities and oversight model
            </li>
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Works signed in or anonymous
            </li>
          </ul>
          <span className="mt-auto flex items-center gap-1 text-xs font-medium text-accent group-hover:underline">
            Register agent
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </Link>

        {/* Register a Team */}
        <Link
          href="/register/team"
          className="group relative flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent/5 p-6 transition-colors hover:border-accent/60 hover:bg-accent/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <TopologyGlyph topology="orchestrator_worker" size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Register a Team</h2>
              <p className="text-[11px] text-text-tertiary">A working harness</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            A multi-agent harness with topology, member agents, and evidence. The configuration is
            the asset — this is the full documented blueprint.
          </p>
          <ul className="space-y-1 text-[11px] text-text-tertiary">
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Topology selection (5 named patterns)
            </li>
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Add member agents inline — created atomically
            </li>
            <li className="flex items-center gap-1.5">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Blueprint: why it works, how it was built
            </li>
          </ul>
          <span className="mt-auto flex items-center gap-1 text-xs font-medium text-accent group-hover:underline">
            Register team
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-text-tertiary">
        All submissions start at <span className="font-mono text-[10px]">self_reported</span> tier.
        Log proof entries with public evidence links after creation and the computed tier upgrades
        automatically.
      </p>
    </div>
  );
}
