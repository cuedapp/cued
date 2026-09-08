"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";

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
  const { isPending, onSubmit } = useUrlFormNavigation((data) => ({
    query: String(data.get("query") ?? "").trim(),
    type: String(data.get("type")),
    sort: String(data.get("sort")),
  }));
  const active = values.query.length > 0 || values.type !== "all" || values.sort !== "added";

  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{labels.title}</h2>
            <p className="text-xs text-muted-foreground">{labels.help}</p>
          </div>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          aria-disabled={!active}
          className={!active ? "pointer-events-none opacity-40" : ""}
        >
          <Link href="/following" scroll={false}>
            <RotateCcw className="size-4" />
            {labels.clear}
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(16rem,2fr)_repeat(2,minmax(11rem,1fr))_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm">
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
        <Button type="submit" disabled={isPending} className="lg:self-end">
          {labels.apply}
        </Button>
      </div>
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
    <label className="grid gap-1.5 text-sm">
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
