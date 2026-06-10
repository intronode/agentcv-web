'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/agents', label: 'Agents' },
  { href: '/teams', label: 'Teams & Swarms' },
  { href: '/trust', label: 'Trust Model' },
];

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
          <Link
            href="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Register Agent
          </Link>
        </div>
      </div>
    </nav>
  );
}
