// Skeleton matches ConfigurationCard geometry: avatar+header row, tagline, spec row, members, metrics footer
function ConfigurationCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface-elevated p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-surface" />
          <div>
            <div className="h-4 w-32 rounded bg-border" />
            <div className="mt-1.5 h-3 w-20 rounded bg-border" />
          </div>
        </div>
        <div className="h-5 w-20 rounded-full bg-border" />
      </div>
      {/* Tagline */}
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-1.5 h-3 w-4/5 rounded bg-border" />
      {/* Spec row */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-border" />
        <div className="h-3 w-16 rounded bg-border" />
        <div className="h-3 w-10 rounded bg-border" />
        <div className="h-3 w-20 rounded bg-border" />
      </div>
      {/* Members */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-6 w-24 rounded-md bg-border" />
        ))}
      </div>
      {/* Footer */}
      <div className="mt-4 flex items-center gap-4 border-t border-border-subtle pt-4">
        <div className="h-3 w-16 rounded bg-border" />
        <div className="h-3 w-20 rounded bg-border" />
        <div className="ml-auto h-3 w-12 rounded bg-border" />
      </div>
    </div>
  );
}

export default function ConfigurationsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-elevated" />
      <div className="mt-2 h-4 w-80 animate-pulse rounded bg-surface-elevated" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-32 animate-pulse rounded-lg bg-surface-elevated" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ConfigurationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
