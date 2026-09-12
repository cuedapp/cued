function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function RequestsLoading() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-48" />
        <Block className="h-5 w-full" />
      </header>
      <section className="space-y-4">
        <Block className="h-8 w-48" />
        {Array.from({ length: 3 }, (_, index) => (
          <Block key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </section>
      <section className="space-y-4">
        <Block className="h-8 w-40" />
        {Array.from({ length: 4 }, (_, index) => (
          <Block key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </section>
    </div>
  );
}
