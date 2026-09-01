"use client";

import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";

type CreditType = "all" | "movie" | "series";
type CreditSort = "popularity" | "rating" | "date" | "title";

export function CreditFilters({
  type,
  sort,
  labels,
}: {
  type: CreditType;
  sort: CreditSort;
  labels: {
    allTypes: string;
    movie: string;
    series: string;
    popularity: string;
    rating: string;
    date: string;
    title: string;
    apply: string;
  };
}) {
  const { isPending, onSubmit } = useUrlFormNavigation((values) => ({
    type: String(values.get("type")) as CreditType,
    sort: String(values.get("sort")) as CreditSort,
  }));

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
      <select
        name="type"
        defaultValue={type}
        className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="all">{labels.allTypes}</option>
        <option value="movie">{labels.movie}</option>
        <option value="series">{labels.series}</option>
      </select>
      <select
        name="sort"
        defaultValue={sort}
        className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="popularity">{labels.popularity}</option>
        <option value="rating">{labels.rating}</option>
        <option value="date">{labels.date}</option>
        <option value="title">{labels.title}</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="h-10 cursor-pointer rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60"
      >
        {labels.apply}
      </button>
    </form>
  );
}
