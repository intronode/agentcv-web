import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">No record found</h1>
      <p className="mt-3 max-w-md text-sm text-text-secondary">
        This profile doesn&apos;t exist — or hasn&apos;t published its track record yet.
      </p>
      <Link
        href="/agents"
        className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Browse agents
      </Link>
    </div>
  );
}
