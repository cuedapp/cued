"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { FilterPanel } from "@/components/filter-panel";
import { LoadingButton } from "@/components/loading-button";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";

type CreditType = "all" | "movie" | "series";
type CreditSort = "popularity" | "rating" | "date" | "title";
type CreditRole = "all" | "acting" | "directing" | "writing" | "producing";

export function CreditFilters({
  type,
  sort,
  role,
  hideGuest,
  labels,
}: {
  type: CreditType;
  sort: CreditSort;
  role: CreditRole;
  hideGuest: boolean;
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
    roleLabel: string;
    allRoles: string;
    acting: string;
    directing: string;
    writing: string;
    producing: string;
    hideGuest: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isPending, onSubmit } = useUrlFormNavigation((values) => ({
    type: String(values.get("type")) as CreditType,
    sort: String(values.get("sort")) as CreditSort,
    role: String(values.get("role")) as CreditRole,
    ...(values.get("hideGuest") === "true" ? {} : { hideGuest: "false" }),
  }));

  return (
    <form onSubmit={onSubmit}>
      <FilterPanel
        title={labels.filterTitle}
        help={labels.filterHelp}
        activeLabel={
          type !== "all" || sort !== "popularity" || role !== "all" || !hideGuest ? labels.activeFilters : undefined
        }
        clearLabel={labels.clear}
        clearDisabled={type === "all" && sort === "popularity" && role === "all" && hideGuest}
        onClear={() => router.push(pathname)}
        footer={
          <LoadingButton type="submit" pending={isPending} className="w-full sm:w-auto">
            {labels.apply}
          </LoadingButton>
        }
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
            <span className="font-medium">{labels.roleLabel}</span>
            <select
              name="role"
              defaultValue={role}
              className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
            >
              <option value="all">{labels.allRoles}</option>
              <option value="acting">{labels.acting}</option>
              <option value="directing">{labels.directing}</option>
              <option value="writing">{labels.writing}</option>
              <option value="producing">{labels.producing}</option>
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 self-end rounded-lg border border-input bg-background px-3 text-sm">
            <input
              name="hideGuest"
              type="checkbox"
              value="true"
              defaultChecked={hideGuest}
              className="size-4 accent-primary"
            />
            <span>{labels.hideGuest}</span>
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
        </div>
      </FilterPanel>
    </form>
  );
}
