import type { ReactNode } from "react";
import { formatPercentage } from "@/lib/ratings";
import { MediaCapabilityBadges } from "./media-capability-badges";
import { RecommendationReasonPopover } from "./recommendation-reason-popover";
import { MediaCard } from "./media-card";
import { PosterBadge } from "./poster-badge";
import { WatchedBadge } from "./watched-badge";

export interface RecommendationCardItem {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  matchPercent: number;
  available: boolean;
  watched?: boolean;
  partiallyWatched?: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
  aiExplanation: string | null;
  contentRatingAge?: number | null;
}

export function RecommendationCard({
  item,
  availableLabel,
  strmAvailableLabel,
  strmPendingLabel,
  strmRequestableLabel,
  typeLabel,
  whyLabel,
  closeLabel,
  aiReasonLabel,
  watchedLabel,
  partiallyWatchedLabel,
  becauseLiked,
  becauseWatched,
  becauseGenres,
  footer,
  topLeft,
}: {
  item: RecommendationCardItem;
  availableLabel: string;
  strmAvailableLabel: string;
  strmPendingLabel: string;
  strmRequestableLabel: string;
  typeLabel: string;
  whyLabel: string;
  closeLabel: string;
  aiReasonLabel: string;
  watchedLabel?: string;
  partiallyWatchedLabel?: string;
  becauseLiked?: string;
  becauseWatched?: string;
  becauseGenres?: string;
  footer?: ReactNode;
  topLeft?: ReactNode;
}) {
  return (
    <MediaCard
      className="min-h-0 min-w-0"
      href={`/title/${item.mediaType}/${item.tmdbId}`}
      posterPath={item.posterPath}
      title={item.title}
      meta={item.releaseDate?.slice(0, 4) ?? typeLabel}
      topLeft={
        topLeft ??
        (item.matchPercent > 0 ? (
          <PosterBadge variant="primary" className="font-bold">
            {formatPercentage(item.matchPercent)}
          </PosterBadge>
        ) : undefined)
      }
      badges={
        <>
          {item.watched && watchedLabel && <WatchedBadge label={watchedLabel} />}
          {item.partiallyWatched && partiallyWatchedLabel && (
            <WatchedBadge state="partial" label={partiallyWatchedLabel} />
          )}
          <MediaCapabilityBadges
            available={item.available}
            strmAvailable={item.strmAvailable}
            strmPending={item.strmPending}
            strmRequestable={item.m3uAvailable}
            availableLabel={availableLabel}
            strmAvailableLabel={strmAvailableLabel}
            strmPendingLabel={strmPendingLabel}
            strmRequestableLabel={strmRequestableLabel}
          />
        </>
      }
      aside={
        (becauseLiked || becauseWatched || becauseGenres || item.aiExplanation) && (
          <RecommendationReasonPopover
            title={whyLabel}
            closeLabel={closeLabel}
            aiTitle={aiReasonLabel}
            becauseLiked={becauseLiked}
            becauseWatched={becauseWatched}
            becauseGenres={becauseGenres}
            aiExplanation={item.aiExplanation}
          />
        )
      }
      footer={footer}
      contentRatingAge={item.contentRatingAge}
    />
  );
}
