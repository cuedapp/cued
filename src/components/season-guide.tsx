"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, CircleCheck, CirclePlay, LoaderCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppDialog } from "./app-dialog";
import { Button } from "./ui/button";

type Season = {
  number: number;
  name: string;
  overview?: string;
  episodeCount: number;
  airDate?: string;
  posterPath?: string;
};

type Episode = {
  id: number;
  number: number;
  name: string;
  overview: string;
  airDate?: string;
  stillPath?: string;
  runtimeMinutes?: number;
  played: boolean;
  progress: number;
};

export function SeasonGuide({ seriesId, seasons }: { seriesId: number; seasons: Season[] }) {
  const t = useTranslations("Title");
  const locale = useLocale();
  const [selected, setSelected] = useState<Season | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function open(season: Season) {
    setSelected(season);
    setEpisodes(null);
    setError(false);
    setLoading(true);
    try {
      const response = await fetch(`/api/tmdb/series/${seriesId}/seasons/${season.number}?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error("Season unavailable");
      const value = (await response.json()) as { episodes: Episode[] };
      setEpisodes(value.episodes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <h2 className="font-display text-2xl font-semibold">{t("seasonGuide")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("seasonGuideHelp")}</p>
      </div>
      <div className="divide-y divide-border/70">
        {seasons.map((season) => {
          const future = season.airDate && new Date(`${season.airDate}T12:00:00Z`) > new Date();
          return (
            <button
              key={season.number}
              type="button"
              onClick={() => open(season)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
            >
              {season.posterPath && (
                <Image
                  src={imageUrl(season.posterPath, "w185")}
                  alt=""
                  width={56}
                  height={84}
                  sizes="56px"
                  className="h-16 w-11 shrink-0 rounded-lg border border-border object-cover sm:h-21 sm:w-14"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium">{season.name}</span>
                  <span className="text-sm text-muted-foreground">{t("episodes", { count: season.episodeCount })}</span>
                  {season.airDate && (
                    <span className="text-sm text-muted-foreground">
                      {t(future ? "seasonAirs" : "seasonAired", { date: formatDate(season.airDate, locale) })}
                    </span>
                  )}
                </span>
                {season.overview && <span className="mt-1 block line-clamp-2 text-sm leading-6 text-muted-foreground">{season.overview}</span>}
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                {t("viewEpisodes")}
                <ChevronDown className="size-4 -rotate-90" />
              </span>
            </button>
          );
        })}
      </div>
      <AppDialog
        isOpen={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        label={selected ? t("episodesFor", { season: selected.name }) : t("seasonGuide")}
        className="max-w-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">{selected && t("episodesFor", { season: selected.name })}</h2>
            {selected && <p className="mt-1 text-sm text-muted-foreground">{t("episodes", { count: selected.episodeCount })}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label={t("close")}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("loadingEpisodes")}</div>}
          {error && <p className="text-sm text-destructive">{t("episodesUnavailable")}</p>}
          {episodes && (
            <ol className="divide-y divide-border/70">
              {episodes.map((episode) => {
                const future = episode.airDate && new Date(`${episode.airDate}T12:00:00Z`) > new Date();
                return (
                  <li key={episode.id} className="flex gap-3 py-4 first:pt-0">
                    {episode.stillPath && (
                      <Image
                        src={imageUrl(episode.stillPath, "w342")}
                        alt=""
                        width={112}
                        height={63}
                        sizes="112px"
                        className="aspect-video w-20 shrink-0 rounded-lg border border-border object-cover sm:w-28"
                      />
                    )}
                    {episode.played ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" /> : <CirclePlay className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <h3 className="font-medium">{t("episodeNumber", { number: episode.number, title: episode.name })}</h3>
                        {episode.airDate && <span className="text-xs text-muted-foreground">{t(future ? "episodeAirs" : "episodeAired", { date: formatDate(episode.airDate, locale) })}</span>}
                      </div>
                      {episode.overview && <p className="mt-1 text-sm leading-6 text-muted-foreground">{episode.overview}</p>}
                      <p className="mt-2 text-xs font-medium text-muted-foreground">
                        {episode.played ? t("episodeWatched") : episode.progress > 0 ? t("episodeInProgress", { percentage: Math.round(episode.progress) }) : t("episodeUnwatched")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </AppDialog>
    </section>
  );
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function imageUrl(path: string, size: "w185" | "w342") {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
