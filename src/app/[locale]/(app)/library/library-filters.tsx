"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";
import { FilterPanel } from "@/components/filter-panel";
import { LoadingButton } from "@/components/loading-button";
import type {
  LibraryRatingSource,
  LibrarySort,
  LibraryStateFilter,
  LibraryTypeFilter,
} from "@/server/db/repositories/library.repository";
import { contentRatingLimitAges } from "@/lib/content-rating";

type Labels = {
  filters: string;
  filtersHelp: string;
  activeFilters: string;
  searchLabel: string;
  searchPlaceholder: string;
  typeLabel: string;
  stateLabel: string;
  genreLabel: string;
  ratingSourceLabel: string;
  ratingLabel: string;
  ageRatingLabel: string;
  anyAgeRating: string;
  anyRating: string;
  sortLabel: string;
  apply: string;
  clear: string;
  allTypes: string;
  allStates: string;
  available: string;
  removed: string;
  types: { movie: string; series: string };
  ratingSources: Record<LibraryRatingSource, string>;
  ratingMinimums: Record<"5" | "6" | "7" | "8" | "9", string>;
  ageRatings: Record<string, string>;
  sort: Record<LibrarySort, string>;
};

export function LibraryFilters({
  values,
  intent,
  genres,
  labels,
}: {
  values: {
    type: LibraryTypeFilter;
    state: LibraryStateFilter;
    query: string;
    genres: string[];
    minimumRating: number | null;
    maximumContentRatingAge: number | null;
    ratingSource: LibraryRatingSource;
    sort: LibrarySort;
  };
  intent?: { presets: string[]; text: string };
  genres: string[];
  labels: Labels;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const intentValue = intent?.presets.join(",") ?? searchParams.get("intent") ?? "";
  const intentTextValue = intent?.text ?? searchParams.get("intentText") ?? "";
  const { isPending, onSubmit } = useUrlFormNavigation((data) => ({
    type: optionalValue(data, "type", "all"),
    state: optionalValue(data, "state", "active"),
    query: optionalValue(data, "query"),
    genre: data.getAll("genre").length ? data.getAll("genre").map(String).join(",") : undefined,
    rating: optionalValue(data, "rating"),
    ratingSource: optionalValue(data, "ratingSource", "jellyfin"),
    maximumAge: optionalValue(data, "maximumAge"),
    sort: optionalValue(data, "sort", "title"),
    intent: optionalValue(data, "intent"),
    intentText: optionalValue(data, "intentText"),
  }));
  const activeCount = [
    values.query.length > 0,
    values.type !== "all",
    values.state !== "active",
    values.genres.length > 0,
    values.minimumRating !== null,
    values.maximumContentRatingAge !== null,
    values.ratingSource !== "jellyfin",
    values.sort !== "title",
  ].filter(Boolean).length;

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="intent" value={intentValue} />
      <input type="hidden" name="intentText" value={intentTextValue} />
      <FilterPanel
        title={labels.filters}
        help={labels.filtersHelp}
        activeLabel={activeCount > 0 ? labels.activeFilters : undefined}
        clearLabel={labels.clear}
        clearDisabled={activeCount === 0}
        onClear={() => router.push("/library")}
        footer={
          <LoadingButton type="submit" pending={isPending} className="w-full sm:w-auto">
            {labels.apply}
          </LoadingButton>
        }
      >
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm">
            <span className="font-medium">{labels.searchLabel}</span>
            <input
              name="query"
              defaultValue={values.query}
              placeholder={labels.searchPlaceholder}
              className="h-10 rounded-lg border border-input bg-background px-3"
            />
          </label>
          <Filter
            name="type"
            label={labels.typeLabel}
            value={values.type}
            options={[
              ["all", labels.allTypes],
              ["movie", labels.types.movie],
              ["series", labels.types.series],
            ]}
          />
          <Filter
            name="state"
            label={labels.stateLabel}
            value={values.state}
            options={[
              ["all", labels.allStates],
              ["active", labels.available],
              ["removed", labels.removed],
            ]}
          />
          <Filter
            name="ratingSource"
            label={labels.ratingSourceLabel}
            value={values.ratingSource}
            options={(Object.keys(labels.ratingSources) as LibraryRatingSource[]).map(
              (source) => [source, labels.ratingSources[source]] as const,
            )}
          />
          <Filter
            name="rating"
            label={labels.ratingLabel}
            value={values.minimumRating?.toString() ?? ""}
            options={[
              ["", labels.anyRating],
              ...(["5", "6", "7", "8", "9"] as const).map((rating) => [rating, labels.ratingMinimums[rating]] as const),
            ]}
          />
          <Filter
            name="maximumAge"
            label={labels.ageRatingLabel}
            value={values.maximumContentRatingAge?.toString() ?? ""}
            options={[
              ["", labels.anyAgeRating],
              ...contentRatingLimitAges.map((age) => [String(age), labels.ageRatings[String(age)]!] as const),
            ]}
          />
          <Filter
            name="sort"
            label={labels.sortLabel}
            value={values.sort}
            options={(Object.keys(labels.sort) as LibrarySort[]).map((sort) => [sort, labels.sort[sort]] as const)}
          />
          {genres.length > 0 && (
            <fieldset className="sm:col-span-2 lg:col-span-3 2xl:col-span-4">
              <legend className="text-sm font-medium">{labels.genreLabel}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <label key={genre} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="genre"
                      value={genre}
                      defaultChecked={values.genres.includes(genre)}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                      {genre}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </FilterPanel>
    </form>
  );
}

function optionalValue(data: FormData, name: string, defaultValue = "") {
  const value = String(data.get(name) ?? "").trim();
  return value && value !== defaultValue ? value : undefined;
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
