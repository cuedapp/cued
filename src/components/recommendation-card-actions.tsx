"use client";

import { useState, useTransition } from "react";
import { EyeOff, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const router = useRouter();
  const [currentFeedback, setCurrentFeedback] = useState(feedback);
  const [pending, startTransition] = useTransition();
  function submit(next: "moreLikeThis" | "notInterested" | "restore") {
    const previous = currentFeedback;
    const optimistic = next === "restore" ? null : next;
    setCurrentFeedback(optimistic);
    const formData = new FormData();
    if ("recommendationId" in feedbackTarget) formData.set("recommendationId", feedbackTarget.recommendationId);
    else { formData.set("mediaType", feedbackTarget.mediaType); formData.set("tmdbId", String(feedbackTarget.tmdbId)); }
    formData.set("feedback", next);
    startTransition(async () => {
      const result = await updateRecommendationFeedback(formData);
      if (result?.error) { setCurrentFeedback(previous); toast.error(t("feedbackFailed")); return; }
      router.refresh();
    });
  }

  return <div className={`grid ${request ? "grid-cols-3" : "grid-cols-2"}`}>
    <HoverTooltip label={t(currentFeedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")}><button type="button" onClick={() => submit(currentFeedback === "moreLikeThis" ? "restore" : "moreLikeThis")} disabled={pending} aria-pressed={currentFeedback === "moreLikeThis"} aria-label={t(currentFeedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")} className="grid h-10 w-full cursor-pointer place-items-center text-muted-foreground hover:bg-accent hover:text-primary disabled:cursor-wait disabled:opacity-60"><Heart className={`size-4 ${currentFeedback === "moreLikeThis" ? "fill-current text-primary" : ""}`} /></button></HoverTooltip>
    <HoverTooltip label={t("notInterested")}><button type="button" onClick={() => submit("notInterested")} disabled={pending} aria-label={t("notInterested")} className="grid h-10 w-full cursor-pointer place-items-center border-l border-border/60 text-muted-foreground hover:bg-accent hover:text-destructive disabled:cursor-wait disabled:opacity-60"><EyeOff className="size-4" /></button></HoverTooltip>
    {request && <div className="border-l border-border/60"><RequestButton {...request} compact iconOnly actionCell tooltip={t("request")} /></div>}
  </div>;
}
