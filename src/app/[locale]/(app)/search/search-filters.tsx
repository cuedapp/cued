"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

export type SearchFilterValues = {
  type: "all" | "movie" | "series" | "person";
  availability: "all" | "jellyfin" | "strm" | "unavailable" | "no-source";
  rating: "all" | "5" | "6" | "7" | "8" | "9";
  genre:
    | "all"
    | "action"
    | "animation"
    | "comedy"
    | "crime"
    | "documentary"
    | "drama"
    | "family"
    | "fantasy"
    | "horror"
    | "romance"
    | "scifi"
    | "thriller";
  decade: string;
  sort: "relevance" | "rating" | "year" | "popularity";
};

export function SearchFilters({
  values,
  decades,
  strmEnabled,
  onChange,
  onReset,
}: {
  values: SearchFilterValues;
  decades: string[];
  strmEnabled: boolean;
  onChange: (values: SearchFilterValues) => void;
  onReset: () => void;
}) {
  const t = useTranslations("Search");
  const activeCount = Object.entries(values).filter(
    ([key, value]) => value !== "all" && !(key === "sort" && value === "relevance"),
  ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{t("filtersTitle")}</h2>
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {t("activeFilters", { count: activeCount })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("filtersHelp")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-4" />
          {t("clearFilters")}
        </button>
      </div>
      <div className="grid gap-x-3 gap-y-4 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 2xl:grid-cols-6">
        <FilterSelect
          name="type"
          label={t("typeLabel")}
          value={values.type}
          onChange={(type) => onChange({ ...values, type: type as SearchFilterValues["type"] })}
          options={[
            ["all", t("typeFilter.all")],
            ["movie", t("typeFilter.movie")],
            ["series", t("typeFilter.series")],
            ["person", t("typeFilter.person")],
          ]}
        />
        <FilterSelect
          name="genre"
          label={t("genreLabel")}
          value={values.genre}
          onChange={(genre) => onChange({ ...values, genre: genre as SearchFilterValues["genre"] })}
          options={[
            ["all", t("genreFilter.all")],
            ...(
              [
                "action",
                "animation",
                "comedy",
                "crime",
                "documentary",
                "drama",
                "family",
                "fantasy",
                "horror",
                "romance",
                "scifi",
                "thriller",
              ] as const
            ).map((genre) => [genre, t(`genreFilter.${genre}`)] as const),
          ]}
        />
        <FilterSelect
          name="decade"
          label={t("decadeLabel")}
          value={values.decade}
          onChange={(decade) => onChange({ ...values, decade })}
          options={[
            ["all", t("decadeFilter.all")],
            ...decades.map((decade) => [decade, t("decadeFilter.value", { decade })] as const),
          ]}
        />
        <FilterSelect
          name="availability"
          label={t("availabilityLabel")}
          value={values.availability}
          onChange={(availability) =>
            onChange({ ...values, availability: availability as SearchFilterValues["availability"] })
          }
          options={[
            ["all", t("availabilityFilter.all")],
            ["jellyfin", t("availabilityFilter.jellyfin")],
            ...(strmEnabled ? ([["strm", t("availabilityFilter.strm")]] as const) : []),
            ["unavailable", t("availabilityFilter.unavailable")],
            ...(strmEnabled ? ([["no-source", t("availabilityFilter.no-source")]] as const) : []),
          ]}
        />
        <FilterSelect
          name="rating"
          label={t("ratingLabel")}
          value={values.rating}
          onChange={(rating) => onChange({ ...values, rating: rating as SearchFilterValues["rating"] })}
          options={[
            ["all", t("ratingFilter.all")],
            ...(["5", "6", "7", "8", "9"] as const).map(
              (rating) => [rating, t("ratingFilter.minimum", { rating })] as const,
            ),
          ]}
        />
        <FilterSelect
          name="sort"
          label={t("sortLabel")}
          value={values.sort}
          onChange={(sort) => onChange({ ...values, sort: sort as SearchFilterValues["sort"] })}
          options={[
            ["relevance", t("sort.relevance")],
            ["rating", t("sort.rating")],
            ["year", t("sort.year")],
            ["popularity", t("sort.popularity")],
          ]}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm"
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
