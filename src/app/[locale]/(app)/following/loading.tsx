import { MediaGrid } from "@/components/media-grid";

function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function FollowingLoading() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl space-y-3">
          <Block className="h-3 w-32" />
          <Block className="h-12 w-56" />
          <Block className="h-5 w-full" />
        </div>
        <Block className="h-10 w-40" />
      </header>
      <section className="space-y-4">
        <Block className="h-8 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Block key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <Block className="h-8 w-32" />
        <MediaGrid>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Block className="aspect-2/3 rounded-none" />
              <div className="space-y-2 p-3">
                <Block className="h-4 w-3/4" />
                <Block className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </MediaGrid>
      </section>
    </div>
  );
}
