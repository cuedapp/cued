"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MediaPoster } from "./media-poster";

type Item = {
  id: string; tmdbId: number; mediaType: string; title: string; posterPath: string | null; releaseDate: string | null;
  reasons: string[]; sourceTitles: Array<{ id: number; type: "movie" | "series"; title: string; reason: "liked" | "watched" }>;
  matchPercent: number; available: boolean;
};

export function RecommendationBrowser({ items }: { items: Item[] }) {
  const t = useTranslations("Recommendations");
  const locale = useLocale();
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [minimum, setMinimum] = useState(0);
  const [clearing, setClearing] = useState(false);
  const genres = useMemo(() => [...new Set(items.flatMap((item) => item.reasons))].sort(), [items]);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = items.filter((item) => (type === "all" || item.mediaType === type) && (genre === "all" || item.reasons.includes(genre)) && (availability === "all" || item.available === (availability === "available")) && item.matchPercent >= minimum).toSorted((a, b) => b.matchPercent - a.matchPercent);

  useEffect(() => {
    const completed = () => window.setTimeout(() => setClearing(false), 500);
    window.addEventListener("cued:recommendation-completed", completed);
    return () => window.removeEventListener("cued:recommendation-completed", completed);
  }, []);

  async function startFresh() {
    dialog.current?.close();
    setClearing(true);
    try {
      const removed = await fetch("/api/recommendations/status", { method: "DELETE" });
      if (!removed.ok) throw new Error("clear failed");
      const refreshed = await fetch("/api/recommendations/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, force: true }) });
      if (!refreshed.ok) throw new Error("refresh failed");
      window.dispatchEvent(new Event("cued:recommendation-refresh"));
    } catch {
      setClearing(false);
    }
  }

  return <><div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"><label className="grid gap-1 text-sm"><span className="font-medium">{t("type")}</span><select value={type} onChange={(event) => setType(event.target.value)} className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"><option value="all">{t("all")}</option><option value="movie">{t("movies")}</option><option value="series">{t("series")}</option></select></label><label className="grid gap-1 text-sm"><span className="font-medium">{t("genre")}</span><select value={genre} onChange={(event) => setGenre(event.target.value)} className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"><option value="all">{t("allGenres")}</option>{genres.map((value) => <option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm"><span className="font-medium">{t("availability")}</span><select value={availability} onChange={(event) => setAvailability(event.target.value)} className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"><option value="all">{t("allAvailability")}</option><option value="available">{t("available")}</option><option value="unavailable">{t("notAvailable")}</option></select></label><label className="grid min-w-52 flex-1 gap-1 text-sm"><span className="font-medium">{t("minimumMatch", { value: minimum })}</span><input type="range" min="0" max="95" step="5" value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} className="h-10 cursor-pointer accent-primary" /></label><button type="button" onClick={() => dialog.current?.showModal()} disabled={clearing} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-wait disabled:opacity-60">{clearing ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{t("startFresh")}</button></div>{clearing ? <RecommendationSkeleton label={t("regenerating")} /> : <><p className="text-sm text-muted-foreground">{t("showing", { shown: filtered.length, total: items.length })}</p>{filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("empty")}</div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{filtered.map((item) => { const liked = item.sourceTitles.filter((source) => source.reason === "liked"); const watched = item.sourceTitles.filter((source) => source.reason === "watched"); return <article key={item.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card"><Link href={`/title/${item.mediaType}/${item.tmdbId}` as never} className="flex flex-1 flex-col"><MediaPoster path={item.posterPath ?? undefined} alt={item.title} className="rounded-none border-0" badges={<><span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">{item.matchPercent}%</span>{item.available && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"><CheckCircle2 className="size-3.5" />{t("available")}</span>}</>} /><div className="flex-1 p-3"><h2 className="line-clamp-2 font-medium">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">{item.releaseDate?.slice(0, 4) ?? t(item.mediaType === "movie" ? "movie" : "series")}</p>{liked.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("becauseTitles", { titles: liked.map((source) => source.title).join(", ") })}</p>}{watched.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{t("becauseWatched", { titles: watched.map((source) => source.title).join(", ") })}</p>}{item.sourceTitles.length === 0 && item.reasons.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">{t("becauseGenres", { genres: item.reasons.join(", ") })}</p> : null}</div></Link></article>; })}</div>}</>}<dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60"><div className="p-6"><h2 className="font-display text-2xl font-semibold">{t("confirmTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("confirmClear")}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => dialog.current?.close()} className="h-10 cursor-pointer rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent">{t("cancel")}</button><button type="button" onClick={startFresh} className="h-10 cursor-pointer rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">{t("confirm")}</button></div></div></dialog></>;
}

function RecommendationSkeleton({ label }: { label: string }) {
  return <div aria-live="polite"><div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />{label}</div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-2/3 animate-pulse bg-muted" /><div className="space-y-2 p-3"><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /></div></div>)}</div></div>;
}
