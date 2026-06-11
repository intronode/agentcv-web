'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const LINKS = [
  { href: '/configurations', label: 'Configurations' },
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
            Submit configuration
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">AgentCV</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition-colors hover:text-text-primary ${
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
