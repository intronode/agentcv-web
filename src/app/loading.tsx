// Root loading skeleton — matches the hero+stats layout geometry
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-6">
      <section className="border-b border-border-subtle py-20 md:py-28">
        <div className="h-3 w-36 rounded bg-surface-elevated" />
        <div className="mt-4 h-12 w-3/4 rounded-lg bg-surface-elevated" />
        <div className="mt-3 h-7 w-1/2 rounded-lg bg-surface-elevated" />
        <div className="mt-6 h-4 w-2/3 rounded bg-surface-elevated" />
        <div className="mt-2 h-4 w-1/2 rounded bg-surface-elevated" />
        <div className="mt-8 flex gap-3">
          <div className="h-10 w-40 rounded-lg bg-surface-elevated" />
          <div className="h-10 w-36 rounded-lg bg-surface-elevated" />
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-elevated px-5 py-4">
              <div className="h-7 w-12 rounded bg-border" />
              <div className="mt-2 h-3 w-24 rounded bg-border" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
