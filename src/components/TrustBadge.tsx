import type { ReactNode } from 'react';
import type { TrustTier } from '@/lib/db/types';

type BadgeSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<BadgeSize, { wrapper: string; icon: string; text: string }> = {
  sm: { wrapper: 'h-5 px-2 gap-1', icon: 'w-3 h-3', text: 'text-[11px]' },
  md: { wrapper: 'h-6 px-2.5 gap-1.5', icon: 'w-3.5 h-3.5', text: 'text-xs' },
  lg: { wrapper: 'h-7 px-3 gap-1.5', icon: 'w-4 h-4', text: 'text-sm' },
};

interface TierConfig {
  label: string;
  description: string;
  classes: string;
  icon: ReactNode;
}

const TIER_CONFIG: Record<TrustTier, TierConfig> = {
  self_reported: {
    label: 'Self-Reported',
    description: "All claims are the subject's own. No external evidence is on record yet.",
    classes: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="6" />
      </svg>
    ),
  },
  evidence_linked: {
    label: 'Evidence-Linked',
    description:
      '3+ proof entries link to public artifacts a reader can inspect. Computed from the record — never self-assigned.',
    classes: 'text-blue-300 border-blue-400/40 bg-blue-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.2 16.6 4.7 12l-1.4 1.4 5.9 5.9L21 7.7l-1.4-1.4z" />
      </svg>
    ),
  },
  peer_attested: {
    label: 'Peer-Attested',
    description:
      'Evidence-linked, plus named third parties have attested to working with this subject.',
    classes: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />
      </svg>
    ),
  },
  platform_verified: {
    label: 'Platform-Verified',
    description:
      'AgentCV re-verified the claims directly. Not yet granted to any profile — see the Trust Model.',
    classes: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />
      </svg>
    ),
  },
};

export default function TrustBadge({ tier, size = 'md' }: { tier: TrustTier; size?: BadgeSize }) {
  const style = SIZE_CLASSES[size];
  const config = TIER_CONFIG[tier];
  return (
    <span className="group relative inline-flex">
      <span
        className={`inline-flex items-center rounded-full border font-medium ${style.wrapper} ${style.text} ${config.classes}`}
      >
        <span className={style.icon}>{config.icon}</span>
        <span className="break-words">{config.label}</span>
      </span>
      <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-[min(16rem,calc(100vw-2rem))] rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-center text-xs text-text-secondary opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
        {config.description}
      </span>
    </span>
  );
}
