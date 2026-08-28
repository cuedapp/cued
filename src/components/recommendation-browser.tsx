"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, RefreshCw, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RequestButton, type RequestOptions } from "./request-button";
import { RecommendationCard as SharedRecommendationCard } from "./recommendation-card";

type Item = {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  reasons: string[];
  sourceTitles: Array<{ id: number; type: "movie" | "series"; title: string; reason: "liked" | "watched" }>;
  matchPercent: number;
  aiScore: number | null;
  aiExplanation: string | null;
  available: boolean;
};

export function RecommendationBrowser({ items, aiEnabled = false, requestable = { movie: false, series: false }, requestOptions, allowRequestOptions = false, requestStates = {} }: { items: Item[]; aiEnabled?: boolean; requestable?: { movie: boolean; series: boolean }; requestOptions?: { movie: RequestOptions; series: RequestOptions }; allowRequestOptions?: boolean; requestStates?: Record<string, "idle" | "pending" | "existing"> }) {
  const t = useTranslations("Recommendations");
  const locale = useLocale();
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [minimum, setMinimum] = useState(0);
  const [startingFresh, setStartingFresh] = useState(false);
  const [refreshingAi, setRefreshingAi] = useState(false);
  const busy = startingFresh || refreshingAi;
  const genres = useMemo(() => [...new Set(items.flatMap((item) => item.reasons))].sort(), [items]);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = items
    .filter((item) => (type === "all" || item.mediaType === type)
      && (genre === "all" || item.reasons.includes(genre))
      && (availability === "all" || item.available === (availability === "available"))
      && item.matchPercent >= minimum)
    .toSorted(compareRecommendations);
  const filtersActive = type !== "all" || genre !== "all" || availability !== "all" || minimum > 0;

  useEffect(() => {
    const completed = () => window.setTimeout(() => {
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

  async function startFresh() {
    dialog.current?.close();
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
      const result = await response.json().catch(() => undefined) as { detail?: string } | undefined;
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
  }

  return <>
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><SlidersHorizontal className="size-4" /></span>
          <div><h2 className="text-sm font-semibold">{t("filterTitle")}</h2><p className="text-xs text-muted-foreground">{t("filterHelp")}</p></div>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{t("showing", { shown: filtered.length, total: items.length })}</span>
      </div>
      <div className="grid gap-4 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(11rem,1fr)_minmax(16rem,2fr)]">
        <FilterSelect label={t("type")} value={type} onChange={setType} options={[["all", t("all")], ["movie", t("movies")], ["series", t("series")]]} />
        <FilterSelect label={t("genre")} value={genre} onChange={setGenre} options={[["all", t("allGenres")], ...genres.map((value) => [value, value] as const)]} />
        <FilterSelect label={t("availability")} value={availability} onChange={setAvailability} options={[["all", t("allAvailability")], ["available", t("available")], ["unavailable", t("notAvailable")]]} />
        <label className="grid gap-1.5 text-sm sm:col-span-2 lg:col-span-1">
          <span className="flex items-center justify-between gap-3 font-medium"><span>{t("match")}</span><output className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{minimum}%+</output></span>
          <input type="range" min="0" max="95" step="5" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} aria-label={t("minimumMatch", { value: minimum })} className="h-10 w-full cursor-pointer accent-primary" />
        </label>
      </div>
      <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>{filtersActive && <button type="button" onClick={resetFilters} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"><RotateCcw className="size-4" />{t("resetFilters")}</button>}</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {aiEnabled && <button type="button" onClick={refreshAiProfile} disabled={busy} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3.5 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60">{refreshingAi ? <RefreshCw className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}{t("refreshAiProfile")}</button>}
          <button type="button" onClick={() => dialog.current?.showModal()} disabled={busy} className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-wait disabled:opacity-60">{startingFresh ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{t("startFresh")}</button>
        </div>
      </div>
    </section>

    {busy ? <RecommendationSkeleton label={t("regenerating")} /> : filtered.length === 0
      ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("empty")}</div>
      : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{filtered.map((item) => <RecommendationCard key={item.id} item={item} requestable={item.mediaType === "movie" ? requestable.movie : requestable.series} options={requestOptions?.[item.mediaType as "movie" | "series"]} allowOptions={allowRequestOptions} initialState={requestStates[`${item.mediaType}:${item.tmdbId}`] ?? "idle"} />)}</div>}

    <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60">
      <div className="p-6"><h2 className="font-display text-2xl font-semibold">{t("confirmTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("confirmClear")}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => dialog.current?.close()} className="h-10 cursor-pointer rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent">{t("cancel")}</button><button type="button" onClick={startFresh} className="h-10 cursor-pointer rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">{t("confirm")}</button></div></div>
    </dialog>
  </>;
}

function compareRecommendations(a: Item, b: Item) {
  const tier = (item: Item) => item.sourceTitles.length > 0 ? 2 : item.aiScore !== null ? 1 : 0;
  return tier(b) - tier(a) || b.matchPercent - a.matchPercent;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function RecommendationCard({ item, requestable, options, allowOptions, initialState }: { item: Item; requestable: boolean; options?: RequestOptions; allowOptions: boolean; initialState: "idle" | "pending" | "existing" }) {
  const t = useTranslations("Recommendations");
  const liked = item.sourceTitles.filter((source) => source.reason === "liked");
  const watched = item.sourceTitles.filter((source) => source.reason === "watched");
  return <SharedRecommendationCard item={item} availableLabel={t("available")} typeLabel={t(item.mediaType === "movie" ? "movie" : "series")} becauseLiked={liked.length > 0 ? t("becauseTitles", { titles: liked.map((source) => source.title).join(", ") }) : undefined} becauseWatched={watched.length > 0 ? t("becauseWatched", { titles: watched.map((source) => source.title).join(", ") }) : undefined} becauseGenres={item.sourceTitles.length === 0 && item.reasons.length > 0 ? t("becauseGenres", { genres: item.reasons.join(", ") }) : undefined} footer={requestable ? <div className="p-3"><RequestButton type={item.mediaType as "movie" | "series"} tmdbId={item.tmdbId} compact options={options} allowOptions={allowOptions} initialState={item.available ? "available" : initialState} /></div> : undefined} />;
}

function RecommendationSkeleton({ label }: { label: string }) {
  return <div aria-live="polite"><div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />{label}</div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-2/3 animate-pulse bg-muted" /><div className="space-y-2 p-3"><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /></div></div>)}</div></div>;
}
