function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function ProfileLoading() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <Block className="size-20 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <Block className="h-8 w-48" />
          <Block className="h-4 w-72 max-w-full" />
        </div>
      </section>
      <Block className="h-72 w-full rounded-2xl" />
      <section className="grid gap-4 sm:grid-cols-2">
        <Block className="h-60 rounded-2xl" />
        <Block className="h-60 rounded-2xl" />
      </section>
      <section className="space-y-3">
        <Block className="h-7 w-48" />
        <Block className="h-32 w-full rounded-2xl" />
        <Block className="h-32 w-full rounded-2xl" />
      </section>
    </div>
  );
}
