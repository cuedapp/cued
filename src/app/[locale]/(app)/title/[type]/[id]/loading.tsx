function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function TitleLoading() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-end">
          <Block className="aspect-2/3 w-40 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-4">
            <Block className="h-3 w-24" />
            <Block className="h-12 w-3/4" />
            <Block className="h-5 w-full max-w-xl" />
            <Block className="h-10 w-40" />
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <Block className="h-8 w-48" />
        <Block className="h-24 w-full rounded-2xl" />
        <Block className="h-24 w-full rounded-2xl" />
      </section>
    </div>
  );
}
