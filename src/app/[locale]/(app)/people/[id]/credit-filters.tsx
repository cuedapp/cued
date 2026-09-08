"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { FilterPanel } from "@/components/filter-panel";
import { Button } from "@/components/ui/button";
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
    filterTitle: string;
    filterHelp: string;
    activeFilters: string;
    clear: string;
    sortLabel: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isPending, onSubmit } = useUrlFormNavigation((values) => ({
    type: String(values.get("type")) as CreditType,
    sort: String(values.get("sort")) as CreditSort,
  }));

  return (
    <form onSubmit={onSubmit}>
      <FilterPanel
        title={labels.filterTitle}
        help={labels.filterHelp}
        activeLabel={type !== "all" || sort !== "popularity" ? labels.activeFilters : undefined}
        clearLabel={labels.clear}
        clearDisabled={type === "all" && sort === "popularity"}
        onClear={() => router.push(pathname)}
      >
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="font-medium">{labels.allTypes}</span>
            <select
              name="type"
              defaultValue={type}
              className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
            >
              <option value="all">{labels.allTypes}</option>
              <option value="movie">{labels.movie}</option>
              <option value="series">{labels.series}</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="font-medium">{labels.sortLabel}</span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
            >
              <option value="popularity">{labels.popularity}</option>
              <option value="rating">{labels.rating}</option>
              <option value="date">{labels.date}</option>
              <option value="title">{labels.title}</option>
            </select>
          </label>
          <Button type="submit" disabled={isPending} className="w-full self-end sm:w-auto">
            {labels.apply}
          </Button>
        </div>
      </FilterPanel>
    </form>
  );
}
