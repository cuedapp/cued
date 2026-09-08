"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";
import { FilterPanel } from "@/components/filter-panel";

type Labels = {
  title: string;
  help: string;
  search: string;
  searchPlaceholder: string;
  type: string;
  allTypes: string;
  movie: string;
  series: string;
  sort: string;
  recentlyFollowed: string;
  upcomingRelease: string;
  titleSort: string;
  apply: string;
  clear: string;
};

export function FollowingFilters({
  values,
  labels,
}: {
  values: { query: string; type: "all" | "movie" | "series"; sort: "added" | "release" | "title" };
  labels: Labels;
}) {
  const router = useRouter();
  const { isPending, onSubmit } = useUrlFormNavigation((data) => ({
    query: String(data.get("query") ?? "").trim(),
    type: String(data.get("type")),
    sort: String(data.get("sort")),
  }));
  const active = values.query.length > 0 || values.type !== "all" || values.sort !== "added";

  return (
    <form onSubmit={onSubmit}>
      <FilterPanel
        title={labels.title}
        help={labels.help}
        clearLabel={labels.clear}
        clearDisabled={!active}
        onClear={() => router.push("/following")}
      >
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="font-medium">{labels.search}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="query"
                defaultValue={values.query}
                placeholder={labels.searchPlaceholder}
                className="h-10 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3"
              />
            </span>
          </label>
          <Filter
            name="type"
            label={labels.type}
            value={values.type}
            options={[
              ["all", labels.allTypes],
              ["movie", labels.movie],
              ["series", labels.series],
            ]}
          />
          <Filter
            name="sort"
            label={labels.sort}
            value={values.sort}
            options={[
              ["added", labels.recentlyFollowed],
              ["release", labels.upcomingRelease],
              ["title", labels.titleSort],
            ]}
          />
          <Button type="submit" disabled={isPending} className="w-full self-end xl:w-auto">
            {labels.apply}
          </Button>
        </div>
      </FilterPanel>
    </form>
  );
}

function Filter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
