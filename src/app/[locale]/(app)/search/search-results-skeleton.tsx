export function SearchResultsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 justify-center gap-4 sm:grid-cols-[repeat(auto-fill,minmax(10rem,12rem))] sm:justify-start">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-2/3 animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-11 animate-pulse border-t border-border/60 bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
