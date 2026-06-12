'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';

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

/** Two-button split CTA: primary = Register (chooser), dropdown = team/agent paths */
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
    <div ref={ref} className="relative flex items-stretch">
      {/* Primary CTA — h-9 fixes exact height; items-center vertically centres the label */}
      <Link
        href="/register"
        className="flex h-9 items-center rounded-l-md bg-accent-button px-4 text-sm font-medium text-white transition-colors hover:bg-accent-button-hover"
        onClick={() => setOpen(false)}
      >
        Register
      </Link>
      {/* Chevron toggle — same h-9 so both halves are identical height */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More register options"
        className="flex h-9 w-9 items-center justify-center rounded-r-md border-l border-accent-button-hover bg-accent-button text-white transition-colors hover:bg-accent-button-hover"
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
            href="/register/team"
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
            Register team
          </Link>
          <Link
            href="/register/agent"
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

/** Session-aware user menu in the Navbar. */
function UserMenu({
  user,
}: {
  user: { name: string | null; email: string | null; image: string | null };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user.name ?? user.email ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    setOpen(false);
    await signOut({ redirect: false });
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-xs font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
        title={user.name ?? user.email ?? 'Account'}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-text-primary">
              {user.name ?? 'Signed in'}
            </p>
            {user.email && (
              <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

interface NavbarProps {
  user?: { name: string | null; email: string | null; image: string | null } | null;
}

export default function Navbar({ user }: NavbarProps = {}) {
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
          {/* Session area */}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/signin"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
