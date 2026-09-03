import { SearchResultsSkeleton } from "./search-results-skeleton";

export default function SearchLoading() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <div className="h-3 w-52 animate-pulse rounded bg-muted" />
        <div className="h-12 w-44 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="h-12 max-w-3xl animate-pulse rounded-xl bg-muted" />
      <SearchResultsSkeleton />
    </div>
  );
}
