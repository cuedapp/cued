import type { ReactNode } from "react";
import { formatScoreOutOfTen } from "@/lib/ratings";
import { MediaCapabilityBadges } from "./media-capability-badges";
import { RecommendationReasonPopover } from "./recommendation-reason-popover";
import { MediaCard } from "./media-card";

export interface RecommendationCardItem {
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  matchPercent: number;
  available: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
  aiExplanation: string | null;
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
  becauseLiked,
  becauseWatched,
  becauseGenres,
  footer,
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
  becauseLiked?: string;
  becauseWatched?: string;
  becauseGenres?: string;
  footer?: ReactNode;
}) {
  return (
    <MediaCard
      className="min-h-80 min-w-40"
      href={`/title/${item.mediaType}/${item.tmdbId}`}
      posterPath={item.posterPath}
      title={item.title}
      meta={item.releaseDate?.slice(0, 4) ?? typeLabel}
      topLeft={
        <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
          {formatScoreOutOfTen(item.matchPercent)}
        </span>
      }
      badges={
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
    />
  );
}
