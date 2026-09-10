import { MediaGrid } from "@/components/media-grid";

function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function CollectionLoading() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <Block className="aspect-2/3 w-40 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <Block className="h-3 w-32" />
            <Block className="h-10 w-72 max-w-full" />
            <Block className="h-5 w-full max-w-xl" />
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <Block className="h-8 w-48" />
        <MediaGrid density="compact">
          {Array.from({ length: 8 }, (_, index) => (
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
