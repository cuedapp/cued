"use client";

import { useState, useTransition } from "react";
import { EyeOff, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { toast } from "sonner";
import { updateRecommendationFeedback } from "@/app/[locale]/(app)/recommendation-actions";
import { RequestButton, type RequestOptions } from "./request-button";
import { HoverTooltip } from "./hover-tooltip";
import { FollowButton } from "./follow-button";
import { mediaActionButtonVariants } from "./ui/media-action-button";

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

export function RecommendationCardActions({
  feedbackTarget,
  feedback,
  request,
  follow,
}: {
  feedbackTarget: FeedbackTarget;
  feedback: string | null;
  request?: RecommendationRequestAction;
  follow?: { targetType: "movie" | "series"; tmdbId: number; initialFollowing: boolean };
}) {
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
    else {
      formData.set("mediaType", feedbackTarget.mediaType);
      formData.set("tmdbId", String(feedbackTarget.tmdbId));
    }
    formData.set("feedback", next);
    startTransition(async () => {
      const result = await updateRecommendationFeedback(formData);
      if (result?.error) {
        setCurrentFeedback(previous);
        toast.error(t("feedbackFailed"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={`grid ${request ? (follow ? "grid-cols-4" : "grid-cols-3") : follow ? "grid-cols-3" : "grid-cols-2"}`}
    >
      <HoverTooltip label={t(currentFeedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")}>
        <AriaButton
          type="button"
          onPress={() => submit(currentFeedback === "moreLikeThis" ? "restore" : "moreLikeThis")}
          isDisabled={pending}
          aria-pressed={currentFeedback === "moreLikeThis"}
          aria-label={t(currentFeedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")}
          className={mediaActionButtonVariants()}
        >
          <Heart
            className={`size-4.5 shrink-0 ${currentFeedback === "moreLikeThis" ? "fill-current text-primary" : ""}`}
          />
        </AriaButton>
      </HoverTooltip>
      <HoverTooltip label={t("notInterested")}>
        <AriaButton
          type="button"
          onPress={() => submit("notInterested")}
          isDisabled={pending}
          aria-label={t("notInterested")}
          className={`${mediaActionButtonVariants()} border-l border-border/60`}
        >
          <EyeOff className="size-4.5 shrink-0" />
        </AriaButton>
      </HoverTooltip>
      {follow && (
        <div className="border-l border-border/60">
          <FollowButton
            targetType={follow.targetType}
            tmdbId={follow.tmdbId}
            initialFollowing={follow.initialFollowing}
            iconOnly
          />
        </div>
      )}
      {request && (
        <div className="min-w-10 border-l border-border/60">
          <RequestButton {...request} compact iconOnly actionCell tooltip={t("request")} />
        </div>
      )}
    </div>
  );
}
