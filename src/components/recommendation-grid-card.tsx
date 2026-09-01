"use client";

import { useTranslations } from "next-intl";
import { RecommendationCard, type RecommendationCardItem } from "./recommendation-card";
import { RecommendationCardActions, type RecommendationRequestAction } from "./recommendation-card-actions";

export type RecommendationGridItem = RecommendationCardItem & {
  id: string;
  feedback: string | null;
  reasons: string[];
  sourceTitles: Array<{ id: number; type: "movie" | "series"; title: string; reason: "liked" | "watched" }>;
};

export function RecommendationGridCard({
  item,
  labels,
  request,
}: {
  item: RecommendationGridItem;
  labels: {
    available: string;
    strmAvailable: string;
    strmPending: string;
    strmRequestable: string;
    type: string;
    becauseLiked?: string;
    becauseWatched?: string;
    becauseGenres?: string;
  };
  request?: RecommendationRequestAction;
}) {
  const t = useTranslations("RecommendationCard");
  return (
    <RecommendationCard
      item={item}
      availableLabel={labels.available}
      strmAvailableLabel={labels.strmAvailable}
      strmPendingLabel={labels.strmPending}
      strmRequestableLabel={labels.strmRequestable}
      typeLabel={labels.type}
      whyLabel={t("why")}
      closeLabel={t("close")}
      aiReasonLabel={t("aiReason")}
      becauseLiked={labels.becauseLiked}
      becauseWatched={labels.becauseWatched}
      becauseGenres={labels.becauseGenres}
      footer={
        <RecommendationCardActions
          feedbackTarget={{ recommendationId: item.id }}
          feedback={item.feedback}
          request={request}
        />
      }
    />
  );
}
