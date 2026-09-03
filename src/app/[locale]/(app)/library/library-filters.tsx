"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";
import type {
  LibraryRatingSource,
  LibrarySort,
  LibraryStateFilter,
  LibraryTypeFilter,
} from "@/server/db/repositories/library.repository";

type Labels = {
  filters: string;
  filtersHelp: string;
  searchLabel: string;
  searchPlaceholder: string;
  typeLabel: string;
  stateLabel: string;
  genreLabel: string;
  ratingSourceLabel: string;
  ratingLabel: string;
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
    ratingSource: LibraryRatingSource;
    sort: LibrarySort;
  };
  intent?: { presets: string[]; text: string };
  genres: string[];
  labels: Labels;
}) {
  const searchParams = useSearchParams();
  const intentValue = intent?.presets.join(",") ?? searchParams.get("intent") ?? "";
  const intentTextValue = intent?.text ?? searchParams.get("intentText") ?? "";
  const { isPending, onSubmit } = useUrlFormNavigation((data) => ({
    type: String(data.get("type")),
    state: String(data.get("state")),
    query: String(data.get("query") ?? "").trim(),
    genre: data.getAll("genre").map(String).join(","),
    rating: String(data.get("rating")),
    ratingSource: String(data.get("ratingSource")),
    sort: String(data.get("sort")),
    intent: String(data.get("intent")),
    intentText: String(data.get("intentText")),
  }));
  const advancedActive =
    values.state !== "active" ||
    values.genres.length > 0 ||
    values.minimumRating !== null ||
    values.ratingSource !== "jellyfin";
  const [advancedOpen, setAdvancedOpen] = useState(advancedActive);

  return (
    <form onSubmit={onSubmit} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <input type="hidden" name="intent" value={intentValue} />
      <input type="hidden" name="intentText" value={intentTextValue} />
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{labels.filters}</h2>
            <p className="text-xs text-muted-foreground">{labels.filtersHelp}</p>
          </div>
        </div>
        <Link
          href="/library"
          scroll={false}
          onClick={() => setAdvancedOpen(false)}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="size-4" />
          {labels.clear}
        </Link>
      </div>
      <div className="grid gap-3 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[minmax(18rem,2fr)_repeat(2,minmax(12rem,1fr))_auto] xl:items-end">
        <label className="grid gap-1.5 text-sm">
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
          name="sort"
          label={labels.sortLabel}
          value={values.sort}
          options={(Object.keys(labels.sort) as LibrarySort[]).map((sort) => [sort, labels.sort[sort]] as const)}
        />
        <div className="flex gap-2 md:col-span-2 xl:col-span-1">
          <button
            type="submit"
            disabled={isPending}
            className="h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
          >
            {labels.apply}
          </button>
        </div>
      </div>
      <details
        className="border-t border-border/70 px-4 py-3 sm:px-5"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
          <SlidersHorizontal className="size-4 text-primary" />
          {labels.filters}
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          {genres.length > 0 && (
            <fieldset className="sm:col-span-2 xl:col-span-3">
              <legend className="text-sm font-medium">{labels.genreLabel}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <label key={genre} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="genre"
                      value={genre}
                      defaultChecked={values.genres.includes(genre)}
                      onChange={(event) => event.currentTarget.form?.requestSubmit()}
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
          <Filter
            name="rating"
            label={labels.ratingLabel}
            value={values.minimumRating?.toString() ?? ""}
            options={[
              ["", labels.anyRating],
              ...(["5", "6", "7", "8", "9"] as const).map((rating) => [rating, labels.ratingMinimums[rating]] as const),
            ]}
          />
        </div>
      </details>
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
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
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
