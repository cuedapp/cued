"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, RefreshCw, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  rankForViewingIntent,
  recommendationViewingIntentPresets,
  type ViewingIntentPreset,
} from "@/lib/viewing-intent";
import { formatPercentage } from "@/lib/ratings";
import { matchesRecommendationAvailability, type RecommendationAvailability } from "@/lib/recommendation-availability";
import { sortRecommendations, type RecommendationSort } from "@/lib/recommendation-sort";
import { Button } from "./ui/button";
import type { RequestOptions } from "./request-button";
import { RecommendationGridCard } from "./recommendation-grid-card";
import { AppDialog } from "./app-dialog";
import { ViewingIntentControls } from "./viewing-intent-controls";

type Item = {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string | null;
  genreIds: number[];
  reasons: string[];
  sourceTitles: Array<{ id: number; type: "movie" | "series"; title: string; reason: "liked" | "watched" }>;
  score: number;
  matchPercent: number;
  rating: number;
  voteCount: number;
  popularity: number;
  generatedAt: Date;
  aiScore: number | null;
  aiExplanation: string | null;
  feedback: string | null;
  available: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
};

export function RecommendationBrowser({
  items,
  aiEnabled = false,
  requestable = { movie: false, series: false },
  requestOptions,
  allowRequestOptions = false,
  requestStates = {},
  following = {},
}: {
  items: Item[];
  aiEnabled?: boolean;
  requestable?: { movie: boolean; series: boolean };
  requestOptions?: { movie: RequestOptions; series: RequestOptions };
  allowRequestOptions?: boolean;
  requestStates?: Record<string, "idle" | "pending" | "existing">;
  following?: Record<string, boolean>;
}) {
  const t = useTranslations("Recommendations");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [type, setType] = useState(() => member(searchParams.get("type"), ["all", "movie", "series"], "all"));
  const [genre, setGenre] = useState(() => searchParams.get("genre") || "all");
  const [availability, setAvailability] = useState<RecommendationAvailability>(() =>
    member(searchParams.get("availability"), ["all", "jellyfin", "strm", "m3u", "unavailable"], "all"),
  );
  const [minimum, setMinimum] = useState(() =>
    numericFilter(
      searchParams.get("match"),
      [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
    ),
  );
  const [minimumRating, setMinimumRating] = useState(() =>
    numericFilter(searchParams.get("rating"), [0, 5, 6, 7, 8, 9]),
  );
  const [sort, setSort] = useState<RecommendationSort>(() =>
    member(searchParams.get("sort"), ["match", "latest", "rating", "popularity", "year", "title"], "match"),
  );
  const [intentPresets, setIntentPresets] = useState<ViewingIntentPreset[]>(() =>
    (searchParams.get("intent") ?? "")
      .split(",")
      .filter((preset): preset is ViewingIntentPreset =>
        recommendationViewingIntentPresets.includes(preset as ViewingIntentPreset),
      ),
  );
  const [intentText, setIntentText] = useState(() => searchParams.get("intentText") ?? "");
  const [startingFresh, setStartingFresh] = useState(false);
  const [refreshingAi, setRefreshingAi] = useState(false);
  const [freshDialogOpen, setFreshDialogOpen] = useState(false);
  const busy = startingFresh || refreshingAi;
  const genres = useMemo(() => [...new Set(items.flatMap((item) => item.reasons))].sort(), [items]);
  const ranked = rankForViewingIntent(
    items.filter(
      (item) =>
        (type === "all" || item.mediaType === type) &&
        (genre === "all" || item.reasons.includes(genre)) &&
        matchesRecommendationAvailability(item, availability) &&
        item.matchPercent >= minimum &&
        item.rating >= minimumRating,
    ),
    { presets: intentPresets, text: intentText },
  );
  const intentActive = intentPresets.length > 0 || intentText.trim().length > 0;
  const filtered = sort === "match" && intentActive ? ranked : sortRecommendations(ranked, sort);
  const filtersActive =
    type !== "all" || genre !== "all" || availability !== "all" || minimum > 0 || minimumRating > 0 || sort !== "match";
  const activeCount = [
    type !== "all",
    genre !== "all",
    availability !== "all",
    minimum > 0,
    minimumRating > 0,
    sort !== "match",
  ].filter(Boolean).length;
  const strmEnabled = items.some((item) => item.strmAvailable || item.strmPending || item.m3uAvailable);

  useEffect(() => {
    const completed = () =>
      window.setTimeout(() => {
        setStartingFresh(false);
        setRefreshingAi(false);
      }, 500);
    const failed = () => {
      setStartingFresh(false);
      setRefreshingAi(false);
    };
    window.addEventListener("cued:recommendation-completed", completed);
    window.addEventListener("cued:recommendation-failed", failed);
    return () => {
      window.removeEventListener("cued:recommendation-completed", completed);
      window.removeEventListener("cued:recommendation-failed", failed);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setParam(params, "type", type, "all");
    setParam(params, "genre", genre, "all");
    setParam(params, "availability", availability, "all");
    setParam(params, "match", String(minimum), "0");
    setParam(params, "rating", String(minimumRating), "0");
    setParam(params, "sort", sort, "match");
    setParam(params, "intent", intentPresets.join(","), "");
    setParam(params, "intentText", intentText, "");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [availability, genre, intentPresets, intentText, minimum, minimumRating, sort, type]);

  async function startFresh() {
    setFreshDialogOpen(false);
    setStartingFresh(true);
    try {
      const removed = await fetch("/api/recommendations/status", { method: "DELETE" });
      if (!removed.ok) throw new Error("clear failed");
      const refreshed = await fetch("/api/recommendations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, force: true }),
      });
      if (!refreshed.ok) throw new Error("refresh failed");
      window.dispatchEvent(new Event("cued:recommendation-refresh"));
    } catch {
      toast.error(t("refreshFailed"));
      setStartingFresh(false);
    }
  }

  async function refreshAiProfile() {
    setRefreshingAi(true);
    const response = await fetch("/api/ai/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => undefined)) as { detail?: string } | undefined;
      toast.error(result?.detail ?? t("refreshAiFailed"));
      setRefreshingAi(false);
      return;
    }
    window.dispatchEvent(new Event("cued:recommendation-refresh"));
  }

  function resetFilters() {
    setType("all");
    setGenre("all");
    setAvailability("all");
    setMinimum(0);
    setMinimumRating(0);
    setSort("match");
  }

  return (
    <>
      <ViewingIntentControls
        presets={intentPresets}
        text={intentText}
        availablePresets={recommendationViewingIntentPresets}
        onPresetsChange={setIntentPresets}
        onTextChange={setIntentText}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{t("filterTitle")}</h2>
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {t("activeFilters", { count: activeCount })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("filterHelp")}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={!filtersActive}>
            <RotateCcw className="size-4" />
            {t("resetFilters")}
          </Button>
        </div>
        <div className="grid gap-x-3 gap-y-4 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 2xl:grid-cols-6">
          <FilterSelect
            label={t("type")}
            value={type}
            onChange={setType}
            options={[
              ["all", t("all")],
              ["movie", t("movies")],
              ["series", t("series")],
            ]}
          />
          <FilterSelect
            label={t("genre")}
            value={genre}
            onChange={setGenre}
            options={[["all", t("allGenres")], ...genres.map((value) => [value, value] as const)]}
          />
          <FilterSelect
            label={t("sortLabel")}
            value={sort}
            onChange={(value) => setSort(value as RecommendationSort)}
            options={[
              ["match", t("sort.match")],
              ["latest", t("sort.latest")],
              ["rating", t("sort.rating")],
              ["popularity", t("sort.popularity")],
              ["year", t("sort.year")],
              ["title", t("sort.title")],
            ]}
          />
          <FilterSelect
            label={t("availability")}
            value={availability}
            onChange={(value) => setAvailability(value as RecommendationAvailability)}
            options={[
              ["all", t("allAvailability")],
              ["jellyfin", t("jellyfinAvailable")],
              ...(strmEnabled
                ? ([
                    ["strm", t("strmAvailable")],
                    ["m3u", t("m3uAvailable")],
                  ] as const)
                : []),
              ["unavailable", t("notAvailable")],
            ]}
          />
          <FilterSelect
            label={t("rating")}
            value={String(minimumRating)}
            onChange={(value) => setMinimumRating(Number(value))}
            options={[
              ["0", t("anyRating")],
              ...([5, 6, 7, 8, 9] as const).map((rating) => [String(rating), t("ratingAtLeast", { rating })] as const),
            ]}
          />
          <label className="grid gap-1.5 text-sm sm:col-span-2 lg:col-span-1">
            <span className="flex items-center justify-between gap-3 font-medium">
              <span>{t("match")}</span>
              <output className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {formatPercentage(minimum)}+
              </output>
            </span>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minimum}
              onChange={(event) => setMinimum(Number(event.target.value))}
              aria-label={`${t("match")}: ${formatPercentage(minimum)}`}
              className="h-10 w-full cursor-pointer accent-primary"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("showing", { shown: filtered.length, total: items.length })}
          </span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {aiEnabled && (
              <Button type="button" variant="outline" size="sm" onClick={refreshAiProfile} disabled={busy}>
                {refreshingAi ? <RefreshCw className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}
                {t("refreshAiProfile")}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFreshDialogOpen(true)}
              disabled={busy}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {startingFresh ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t("startFresh")}
            </Button>
          </div>
        </div>
      </section>

      {busy ? (
        <RecommendationSkeleton label={t("regenerating")} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map((item) => (
            <RecommendationGridItem
              key={item.id}
              item={item}
              requestable={item.mediaType === "movie" ? requestable.movie : requestable.series}
              options={requestOptions?.[item.mediaType as "movie" | "series"]}
              allowOptions={allowRequestOptions}
              initialState={requestStates[`${item.mediaType}:${item.tmdbId}`] ?? "idle"}
              initialFollowing={following[`${item.mediaType}:${item.tmdbId}`] ?? false}
            />
          ))}
        </div>
      )}

      <AppDialog isOpen={freshDialogOpen} onOpenChange={setFreshDialogOpen} label={t("confirmTitle")}>
        <div className="p-6">
          <h2 className="font-display text-2xl font-semibold">{t("confirmTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("confirmClear")}</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setFreshDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={startFresh}>
              {t("confirm")}
            </Button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3"
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

function RecommendationGridItem({
  item,
  requestable,
  options,
  allowOptions,
  initialState,
  initialFollowing,
}: {
  item: Item;
  requestable: boolean;
  options?: RequestOptions;
  allowOptions: boolean;
  initialState: "idle" | "pending" | "existing";
  initialFollowing: boolean;
}) {
  const t = useTranslations("Recommendations");
  const liked = item.sourceTitles.filter((source) => source.reason === "liked");
  const watched = item.sourceTitles.filter((source) => source.reason === "watched");
  const hasRequest = requestable || item.m3uAvailable;
  return (
    <RecommendationGridCard
      item={item}
      initialFollowing={initialFollowing}
      labels={{
        available: t("available"),
        strmAvailable: t("strmAvailable"),
        strmPending: t("strmPending"),
        strmRequestable: t("strmRequestable"),
        type: t(item.mediaType === "movie" ? "movie" : "series"),
        becauseLiked:
          liked.length > 0 ? t("becauseTitles", { titles: liked.map((source) => source.title).join(", ") }) : undefined,
        becauseWatched:
          watched.length > 0
            ? t("becauseWatched", { titles: watched.map((source) => source.title).join(", ") })
            : undefined,
        becauseGenres:
          item.sourceTitles.length === 0 && item.reasons.length > 0
            ? t("becauseGenres", { genres: item.reasons.join(", ") })
            : undefined,
      }}
      request={
        hasRequest
          ? {
              type: item.mediaType as "movie" | "series",
              tmdbId: item.tmdbId,
              options,
              allowOptions,
              arrAvailable: requestable,
              strmAvailable: item.m3uAvailable && !item.available && !item.strmAvailable && !item.strmPending,
              strmAlreadyAvailable: item.strmAvailable,
              strmImportPending: item.strmPending,
              initialState: item.available ? "available" : initialState,
            }
          : undefined
      }
    />
  );
}

function RecommendationSkeleton({ label }: { label: string }) {
  return (
    <div aria-live="polite">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="size-4 animate-spin" />
        {label}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-2/3 animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function member<T extends string>(value: string | null, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function numericFilter(value: string | null, values: readonly number[]) {
  const parsed = Number(value);
  return values.includes(parsed) ? parsed : 0;
}

function setParam(params: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (value === defaultValue) params.delete(key);
  else params.set(key, value);
}
