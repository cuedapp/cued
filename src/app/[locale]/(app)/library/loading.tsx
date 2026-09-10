import { MediaGrid } from "@/components/media-grid";

function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function LibraryLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-40" />
        <Block className="h-12 w-48" />
        <Block className="h-5 w-full" />
      </header>
      <Block className="h-40 w-full rounded-2xl" />
      <Block className="h-16 w-full rounded-2xl" />
      <MediaGrid density="compact">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Block className="aspect-2/3 rounded-none" />
            <div className="space-y-2 p-3">
              <Block className="h-4 w-3/4" />
              <Block className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </MediaGrid>
    </div>
  );
}
