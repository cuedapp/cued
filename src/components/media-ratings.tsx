"use client";

import { useId, type ReactNode } from "react";
import { Button } from "react-aria-components";
import { siImdb, siMetacritic, siRottentomatoes, siTrakt, type SimpleIcon } from "simple-icons";
import type { RatingSource, RatingValue } from "@/server/db/repositories/media-rating.repository";
import { HoverTooltip } from "./hover-tooltip";

const brandIcons: Partial<Record<RatingSource, SimpleIcon>> = {
  imdb: siImdb,
  rottenTomatoes: siRottentomatoes,
  metacritic: siMetacritic,
  trakt: siTrakt,
};

function BrandIcon({ icon, source }: { icon: SimpleIcon; source: RatingSource }) {
  return <span className={source === "metacritic" ? "grid size-8 place-items-center rounded-md bg-[#ffcc34]" : undefined}>
    <svg viewBox="0 0 24 24" aria-hidden="true" className={source === "metacritic" ? "size-6 text-black" : "size-7"} style={source === "metacritic" ? undefined : { color: `#${icon.hex}` }}><path d={icon.path} fill="currentColor" /></svg>
  </span>;
}

function TmdbIcon() {
  const gradientId = useId();
  return <svg viewBox="0 0 190.24 81.52" aria-hidden="true" className="h-7 w-12">
    <defs><linearGradient id={gradientId} y1="40.76" x2="190.24" y2="40.76" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#90cea1" /><stop offset="0.56" stopColor="#3cbec9" /><stop offset="1" stopColor="#00b3e5" /></linearGradient></defs>
    <path fill={`url(#${gradientId})`} d="M105.67 36.06h66.9a17.67 17.67 0 0 0 0-35.33h-66.9a17.67 17.67 0 0 0 0 35.33Zm-88 45h76.9a17.67 17.67 0 0 0 0-35.33h-76.9a17.67 17.67 0 0 0 0 35.33ZM10.41 35.42h7.8V6.92h10.1V0h-28v6.9h10.1Zm28.1 0h7.8V8.25h.1l9 27.15h6l9.3-27.15h.1V35.4h7.8V0H66.76l-8.2 23.1h-.1L50.31 0H38.51Zm113.92 20.25a15.07 15.07 0 0 0-4.52-5.52 18.57 18.57 0 0 0-6.68-3.08 33.54 33.54 0 0 0-8.07-1h-11.7v35.4h12.75a24.58 24.58 0 0 0 7.55-1.15 19.34 19.34 0 0 0 6.35-3.32 16.27 16.27 0 0 0 4.37-5.5 16.91 16.91 0 0 0 1.63-7.58 18.5 18.5 0 0 0-1.68-8.25ZM145 68.6a8.8 8.8 0 0 1-2.64 3.4 10.7 10.7 0 0 1-4 1.82 21.57 21.57 0 0 1-5 .55h-4.05v-21h4.6a17 17 0 0 1 4.67.63 11.66 11.66 0 0 1 3.88 1.87A9.14 9.14 0 0 1 145 59a9.87 9.87 0 0 1 1 4.52 11.89 11.89 0 0 1-1 5.08Zm44.63-.13a8 8 0 0 0-1.58-2.62 8.38 8.38 0 0 0-2.42-1.85 10.31 10.31 0 0 0-3.17-1v-.1a9.22 9.22 0 0 0 4.42-2.82 7.43 7.43 0 0 0 1.68-5 8.42 8.42 0 0 0-1.15-4.65 8.09 8.09 0 0 0-3-2.72 12.56 12.56 0 0 0-4.18-1.3 32.84 32.84 0 0 0-4.62-.33h-13.2v35.4h14.5a22.41 22.41 0 0 0 4.72-.5 13.53 13.53 0 0 0 4.28-1.65 9.42 9.42 0 0 0 3.1-3 8.52 8.52 0 0 0 1.2-4.68 9.39 9.39 0 0 0-.55-3.18Zm-19.45-15.75h5.3c2.7 0 5.25.72 5.25 3.7 0 2.72-2.25 3.85-4.9 3.85h-5.65Zm11.72 20c-.95 1.62-2.82 2.2-4.72 2.2h-7v-8h5.9c3.05 0 6.25.78 6.25 3.73a3.71 3.71 0 0 1-.43 2.07Z" />
  </svg>;
}

function RatingTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <HoverTooltip label={label}><Button className="grid h-9 min-w-9 cursor-help place-items-center rounded-lg px-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring" aria-label={label}>{children}</Button></HoverTooltip>;
}

export function MediaRatings({ ratings, labels, ratingLabel }: { ratings: RatingValue[]; labels: Record<RatingSource, string>; ratingLabel: string }) {
  if (ratings.length === 0) return null;
  return <div className="flex w-fit max-w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 shadow-sm backdrop-blur-sm" aria-label={ratingLabel}>
    {ratings.map((rating) => {
      const label = labels[rating.source];
      const icon = brandIcons[rating.source];
      return <div key={rating.source} className="flex items-center gap-1.5" aria-label={`${label} ${rating.normalizedScore.toFixed(1)} / 10`}>
        <RatingTooltip label={label}>{rating.source === "tmdb" ? <TmdbIcon /> : icon ? <BrandIcon icon={icon} source={rating.source} /> : null}</RatingTooltip>
        <span className="text-lg font-semibold tabular-nums text-foreground">{rating.normalizedScore.toFixed(1)}</span>
      </div>;
    })}
  </div>;
}
