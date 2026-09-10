function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function HistoryLoading() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl space-y-3">
        <Block className="h-3 w-32" />
        <Block className="h-12 w-40" />
        <Block className="h-5 w-full" />
      </header>
      <Block className="h-16 w-full rounded-2xl" />
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Block key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
