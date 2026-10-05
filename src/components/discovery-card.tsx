"use client";

import { CalendarDays, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaCard } from "./media-card";
import { MediaCapabilityBadges } from "./media-capability-badges";
import { PosterBadge } from "./poster-badge";
import { WatchedBadge } from "./watched-badge";
import { FollowButton } from "./follow-button";
import { RequestButton, type RequestOptions } from "./request-button";
import { formatDisplayDate, parseDateOnly } from "@/lib/date-time";

export interface DiscoveryCardItem {
  id: number;
  type: "movie" | "series";
  title: string;
  overview: string;
  date?: string;
  upcomingDate?: string;
  rating: number;
  contentRatingAge: number | null;
  restricted?: boolean;
  available: boolean;
  watched: boolean;
  partiallyWatched: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
}

export interface DiscoveryCardOptions {
  strmEnabled: boolean;
  requestable: { movie: boolean; series: boolean };
  requestOptions: { movie: RequestOptions; series: RequestOptions };
  allowRequestOptions: boolean;
}

export interface DiscoveryCardStates {
  following: Record<string, boolean>;
  requestStates: Record<string, "idle" | "pending" | "existing">;
}

export function DiscoveryCard({
  item,
  posterPath,
  locale,
  dateFormat,
  options,
  following,
  requestState,
  upcoming = false,
  premiere = false,
}: {
  item: DiscoveryCardItem;
  posterPath?: string;
  locale: string;
  dateFormat: string;
  options: DiscoveryCardOptions;
  following: boolean;
  requestState: "idle" | "pending" | "existing";
  upcoming?: boolean;
  premiere?: boolean;
}) {
  const t = useTranslations("Explore");
  const seasonalT = useTranslations("Seasonal");
  const canRequest = options.requestable[item.type] || (options.strmEnabled && item.m3uAvailable);
  const upcomingDate =
    upcoming && item.upcomingDate ? formatDisplayDate(parseDateOnly(item.upcomingDate), dateFormat, locale) : undefined;
  return (
    <MediaCard
      href={`/title/${item.type}/${item.id}`}
      posterPath={posterPath}
      title={item.title}
      contentRatingAge={item.contentRatingAge}
      restrictedReason={item.restricted ? t("restricted") : undefined}
      topLeft={
        item.rating > 0 ? (
          <PosterBadge>
            <Star className="size-3 fill-current text-primary" />
            {item.rating.toFixed(1)}
          </PosterBadge>
        ) : undefined
      }
      badges={
        <>
          {item.watched && <WatchedBadge label={t("watched")} />}
          {item.partiallyWatched && <WatchedBadge state="partial" label={t("partiallyWatched")} />}
          <MediaCapabilityBadges
            available={item.available}
            strmAvailable={options.strmEnabled && item.strmAvailable}
            strmPending={options.strmEnabled && item.strmPending}
            strmRequestable={options.strmEnabled && item.m3uAvailable}
            availableLabel={t("available")}
            strmAvailableLabel={t("strmAvailable")}
            strmPendingLabel={t("strmPending")}
            strmRequestableLabel={t("strmRequestable")}
          />
        </>
      }
      meta={
        upcomingDate ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <CalendarDays className="size-3.5 text-primary" />
            {premiere
              ? seasonalT("premieresOn", { date: upcomingDate })
              : t(item.type === "movie" ? "releasesOn" : "nextEpisodeOn", { date: upcomingDate })}
          </span>
        ) : item.date ? (
          <span>{item.date.slice(0, 4)}</span>
        ) : undefined
      }
      secondary={item.overview}
      footer={
        <div className={`grid ${canRequest ? "grid-cols-2" : "grid-cols-1"}`}>
          <FollowButton targetType={item.type} tmdbId={item.id} initialFollowing={following} iconOnly />
          {canRequest && (
            <div className="border-l border-border/60">
              <RequestButton
                type={item.type}
                tmdbId={item.id}
                compact
                iconOnly
                actionCell
                tooltip={t("request")}
                allowOptions={options.allowRequestOptions}
                arrAvailable={options.requestable[item.type]}
                strmAvailable={
                  options.strmEnabled &&
                  item.m3uAvailable &&
                  !item.available &&
                  !item.strmAvailable &&
                  !item.strmPending
                }
                strmAlreadyAvailable={options.strmEnabled && item.strmAvailable}
                strmImportPending={options.strmEnabled && item.strmPending}
                options={options.requestOptions[item.type]}
                initialState={item.available ? "available" : requestState}
              />
            </div>
          )}
        </div>
      }
    />
  );
}
