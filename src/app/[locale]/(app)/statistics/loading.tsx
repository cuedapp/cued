function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function StatisticsLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-48" />
        <Block className="h-5 w-full" />
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Block className="h-28 rounded-2xl" />
        <Block className="h-28 rounded-2xl" />
        <Block className="h-28 rounded-2xl" />
      </section>
      <Block className="h-72 w-full rounded-2xl" />
      <section className="grid gap-4 lg:grid-cols-3">
        <Block className="h-56 rounded-2xl" />
        <Block className="h-56 rounded-2xl" />
        <Block className="h-56 rounded-2xl" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <Block className="h-64 rounded-2xl" />
        <Block className="h-64 rounded-2xl" />
        <Block className="h-64 rounded-2xl" />
        <Block className="h-64 rounded-2xl" />
      </section>
    </div>
  );
}
