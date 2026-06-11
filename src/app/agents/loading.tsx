// Skeleton matches AgentCard geometry: avatar+name+badge, tagline, tags, metrics footer
function AgentCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface-elevated p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-xl bg-surface" />
          <div>
            <div className="h-4 w-28 rounded bg-border" />
            <div className="mt-1.5 h-3 w-16 rounded bg-border" />
          </div>
        </div>
        <div className="h-5 w-20 rounded-full bg-border" />
      </div>
      {/* Tagline */}
      <div className="mt-3 h-3 w-full rounded bg-border" />
      <div className="mt-1.5 h-3 w-4/5 rounded bg-border" />
      {/* Tags */}
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-20 rounded-md bg-border" />
        <div className="h-5 w-16 rounded-md bg-border" />
      </div>
      {/* Footer */}
      <div className="mt-4 flex items-center gap-4 border-t border-border-subtle pt-4">
        <div className="h-3 w-14 rounded bg-border" />
        <div className="h-3 w-14 rounded bg-border" />
        <div className="ml-auto h-3 w-12 rounded bg-border" />
      </div>
    </div>
  );
}

export default function AgentsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="h-9 w-52 animate-pulse rounded-lg bg-surface-elevated" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-surface-elevated" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-32 animate-pulse rounded-lg bg-surface-elevated" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
