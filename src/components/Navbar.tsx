'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

/** Compact hub-and-spoke logomark — inline SVG so it renders server-side too. */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      {/* spokes */}
      <line
        x1="14"
        y1="14"
        x2="14"
        y2="4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="14"
        x2="24"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="14"
        x2="14"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="14"
        x2="4"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* satellite nodes */}
      <circle cx="14" cy="4" r="1.8" fill="currentColor" opacity="0.55" />
      <circle cx="24" cy="14" r="1.8" fill="currentColor" opacity="0.55" />
      <circle cx="14" cy="24" r="1.8" fill="currentColor" opacity="0.55" />
      <circle cx="4" cy="14" r="1.8" fill="currentColor" opacity="0.55" />
      {/* hub */}
      <circle cx="14" cy="14" r="3.5" fill="currentColor" />
    </svg>
  );
}

const LINKS = [
  { href: '/teams', label: 'Teams' },
  { href: '/agents', label: 'Components' },
  { href: '/harness-engineering', label: 'Harness Engineering' },
];

/** Two-button split CTA: primary = Submit Configuration, secondary = Register Agent */
function SubmitDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Primary CTA */}
      <Link
        href="/submit"
        className="rounded-l-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        onClick={() => setOpen(false)}
      >
        Submit
      </Link>
      {/* Chevron toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More submit options"
        className="rounded-r-lg border-l border-accent-hover bg-accent px-2 py-2 text-white transition-colors hover:bg-accent-hover"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <Link
            href="/submit"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            onClick={() => setOpen(false)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Submit team
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            onClick={() => setOpen(false)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Register agent
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <LogoMark size={28} />
          <span className="text-base font-semibold tracking-tight">
            <span className="text-text-primary">Agent</span>
            <span className="text-accent">CV</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:flex-nowrap sm:gap-6">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-right text-sm leading-tight transition-colors hover:text-text-primary ${
                pathname.startsWith(href) ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {label}
            </Link>
          ))}
          <SubmitDropdown />
        </div>
      </div>
    </nav>
  );
}
