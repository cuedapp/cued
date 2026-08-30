"use client";

import { EyeOff, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateRecommendationFeedback } from "@/app/[locale]/(app)/recommendation-actions";
import { RequestButton, type RequestOptions } from "./request-button";
import { HoverTooltip } from "./hover-tooltip";

export type RecommendationRequestAction = {
  type: "movie" | "series";
  tmdbId: number;
  options?: RequestOptions;
  allowOptions: boolean;
  arrAvailable: boolean;
  strmAvailable: boolean;
  strmAlreadyAvailable: boolean;
  strmImportPending: boolean;
  initialState: "idle" | "pending" | "existing" | "available";
};

type FeedbackTarget = { recommendationId: string } | { mediaType: "movie" | "series"; tmdbId: number };

export function RecommendationCardActions({ feedbackTarget, feedback, request }: { feedbackTarget: FeedbackTarget; feedback: string | null; request?: RecommendationRequestAction }) {
  const t = useTranslations("RecommendationCard");
  const target = "recommendationId" in feedbackTarget ? <input type="hidden" name="recommendationId" value={feedbackTarget.recommendationId} /> : <><input type="hidden" name="mediaType" value={feedbackTarget.mediaType} /><input type="hidden" name="tmdbId" value={feedbackTarget.tmdbId} /></>;
  return <div className={`grid ${request ? "grid-cols-3" : "grid-cols-2"}`}>
    <form action={updateRecommendationFeedback}>{target}<HoverTooltip label={t(feedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")}><button name="feedback" value={feedback === "moreLikeThis" ? "restore" : "moreLikeThis"} aria-label={t(feedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")} className="grid h-10 w-full cursor-pointer place-items-center text-muted-foreground hover:bg-accent hover:text-primary"><Heart className={`size-4 ${feedback === "moreLikeThis" ? "fill-current text-primary" : ""}`} /></button></HoverTooltip></form>
    <form action={updateRecommendationFeedback}>{target}<HoverTooltip label={t("notInterested")}><button name="feedback" value="notInterested" aria-label={t("notInterested")} className="grid h-10 w-full cursor-pointer place-items-center border-l border-border/60 text-muted-foreground hover:bg-accent hover:text-destructive"><EyeOff className="size-4" /></button></HoverTooltip></form>
    {request && <div className="border-l border-border/60"><RequestButton {...request} compact iconOnly actionCell tooltip={t("request")} /></div>}
  </div>;
}
