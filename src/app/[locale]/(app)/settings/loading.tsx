function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}
export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-40" />
        <Block className="h-5 w-full" />
      </header>
      <section className="space-y-4">
        <Block className="h-48 w-full rounded-2xl" />
        <Block className="h-48 w-full rounded-2xl" />
        <Block className="h-48 w-full rounded-2xl" />
      </section>
    </div>
  );
}
