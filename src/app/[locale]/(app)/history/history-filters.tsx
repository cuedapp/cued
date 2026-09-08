"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";
import { FilterPanel } from "@/components/filter-panel";

type HistoryQuery = { query: string; filter: string; sort: string; type: string; status: string };

export function HistoryFilters({ query }: { query: HistoryQuery }) {
  const t = useTranslations("History");
  const router = useRouter();
  const { isPending, onSubmit } = useUrlFormNavigation(
    (data) => ({
      query: String(data.get("query") ?? "").trim(),
      status: String(data.get("status")),
      type: String(data.get("type")),
      filter: String(data.get("filter")),
      sort: String(data.get("sort")),
    }),
    { mode: "replace" },
  );
  const active =
    query.query.length > 0 ||
    query.status !== "all" ||
    query.type !== "all" ||
    query.filter !== "all" ||
    query.sort !== "recent";

  return (
    <form onSubmit={onSubmit}>
      <FilterPanel
        title={t("filterAndSort")}
        help={t("filterHelp")}
        activeLabel={active ? t("activeFilters") : undefined}
        clearLabel={t("clearFilters")}
        clearDisabled={!active}
        onClear={() => router.push("/history")}
        footer={
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? t("applyingFilters") : t("applyFilters")}
          </Button>
        }
      >
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium">
            <span>{t("searchLabel")}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="query"
                defaultValue={query.query}
                placeholder={t("searchPlaceholder")}
                className="h-10 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3"
              />
            </span>
          </label>
          <FilterSelect
            name="status"
            label={t("progressLabel")}
            value={query.status}
            options={(["all", "completed", "inProgress"] as const).map((value) => ({
              value,
              label: t(`statusFilter.${value}`),
            }))}
          />
          <FilterSelect
            name="type"
            label={t("typeLabel")}
            value={query.type}
            options={(["all", "movie", "series", "season"] as const).map((value) => ({
              value,
              label: t(`typeFilter.${value}`),
            }))}
          />
          <FilterSelect
            name="filter"
            label={t("ratingFilterLabel")}
            value={query.filter}
            options={(["all", "rated", "unrated", "excluded"] as const).map((value) => ({
              value,
              label: t(`filter.${value}`),
            }))}
          />
          <FilterSelect
            name="sort"
            label={t("sortLabel")}
            value={query.sort}
            options={(["recent", "rating", "title"] as const).map((value) => ({ value, label: t(`sort.${value}`) }))}
          />
        </div>
      </FilterPanel>
    </form>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
