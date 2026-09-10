import { MediaGrid } from "@/components/media-grid";

export function SearchResultsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <MediaGrid>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-2/3 shrink-0 animate-pulse bg-muted">
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
                <div className="h-5 w-10 rounded-full bg-muted-foreground/15" />
                <div className="size-5 rounded-full bg-muted-foreground/15" />
              </div>
            </div>
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-auto grid grid-cols-2 border-t border-border/60">
              <div className="h-10 animate-pulse bg-muted/50" />
              <div className="h-10 animate-pulse border-l border-border/60 bg-muted/50" />
            </div>
          </div>
        ))}
      </MediaGrid>
    </div>
  );
}
