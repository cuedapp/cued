function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function NotificationsLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-56" />
        <Block className="h-5 w-full" />
      </header>
      <Block className="h-10 w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 7 }, (_, index) => (
          <Block key={index} className="h-20 w-full rounded-none border-b border-border/60 last:border-0" />
        ))}
      </div>
    </div>
  );
}
