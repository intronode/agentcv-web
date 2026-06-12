import Link from 'next/link';
import TopologyGlyph from '@/components/TopologyGlyph';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="opacity-25">
        <TopologyGlyph topology="other" size={64} />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">No record found</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
        This profile doesn&apos;t exist — or hasn&apos;t published its track record yet. Every
        configuration here has evidence. If you built something, submit it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/teams"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Browse teams
        </Link>
        <Link
          href="/agents"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Browse agent components
        </Link>
      </div>
    </div>
  );
}
