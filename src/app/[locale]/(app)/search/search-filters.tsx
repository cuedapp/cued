"use client";

import { useTranslations } from "next-intl";
import { FilterPanel } from "@/components/filter-panel";
import { Button } from "@/components/ui/button";

export type SearchFilterValues = {
  type: "all" | "movie" | "series" | "person";
  availability: "all" | "jellyfin" | "strm" | "unavailable" | "no-source";
  watch: "all" | "watched" | "unwatched";
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
  onApply,
  onReset,
}: {
  values: SearchFilterValues;
  decades: string[];
  strmEnabled: boolean;
  onChange: (values: SearchFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const t = useTranslations("Search");
  const activeCount = Object.entries(values).filter(
    ([key, value]) => value !== "all" && !(key === "sort" && value === "relevance"),
  ).length;

  return (
    <FilterPanel
      title={t("filtersTitle")}
      help={t("filtersHelp")}
      activeLabel={activeCount > 0 ? t("activeFilters", { count: activeCount }) : undefined}
      clearLabel={t("clearFilters")}
      clearDisabled={activeCount === 0}
      onClear={onReset}
      footer={
        <Button type="button" onClick={onApply} className="w-full sm:w-auto">
          {t("applyFilters")}
        </Button>
      }
    >
      <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
          name="watch"
          label={t("watchLabel")}
          value={values.watch}
          onChange={(watch) => onChange({ ...values, watch: watch as SearchFilterValues["watch"] })}
          options={[
            ["all", t("watchFilter.all")],
            ["watched", t("watchFilter.watched")],
            ["unwatched", t("watchFilter.unwatched")],
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
    </FilterPanel>
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
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
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
