function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}
export default function UsersLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-48" />
        <Block className="h-5 w-full" />
      </header>
      <Block className="h-20 w-full rounded-2xl" />
      <section className="space-y-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Block key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </section>
    </div>
  );
}
