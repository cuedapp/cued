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

type FeedbackTarget =
  { recommendationId: string } | { mediaType: "movie" | "series"; tmdbId: number; title?: string; overview?: string };

export function RecommendationCardActions({
  feedbackTarget,
  feedback,
  request,
  follow,
  onFeedbackChange,
}: {
  feedbackTarget: FeedbackTarget;
  feedback: string | null;
  request?: RecommendationRequestAction;
  follow?: { targetType: "movie" | "series"; tmdbId: number; initialFollowing: boolean };
  onFeedbackChange?: (feedback: "moreLikeThis" | "notInterested" | null) => void;
}) {
  const t = useTranslations("RecommendationCard");
  const router = useRouter();
  const [currentFeedback, setCurrentFeedback] = useState(feedback);
  const [pending, startTransition] = useTransition();
  function submit(next: "moreLikeThis" | "notInterested" | "restore") {
    const previous = currentFeedback;
    const optimistic = next === "restore" ? null : next;
    setCurrentFeedback(optimistic);
    onFeedbackChange?.(optimistic);
    const formData = new FormData();
    if ("recommendationId" in feedbackTarget) formData.set("recommendationId", feedbackTarget.recommendationId);
    else {
      formData.set("mediaType", feedbackTarget.mediaType);
      formData.set("tmdbId", String(feedbackTarget.tmdbId));
      if (feedbackTarget.title) {
        formData.set("title", feedbackTarget.title);
        formData.set("overview", feedbackTarget.overview ?? "");
      }
    }
    formData.set("feedback", next);
    startTransition(async () => {
      const result = await updateRecommendationFeedback(formData);
      if (result?.error) {
        setCurrentFeedback(previous);
        onFeedbackChange?.(previous as "moreLikeThis" | "notInterested" | null);
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
          onPress={() => {
            if (!pending) void submit(currentFeedback === "moreLikeThis" ? "restore" : "moreLikeThis");
          }}
          aria-disabled={pending || undefined}
          aria-pressed={currentFeedback === "moreLikeThis"}
          aria-label={t(currentFeedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")}
          className={`${mediaActionButtonVariants()} ${pending ? "!cursor-not-allowed opacity-70" : ""}`}
        >
          <Heart
            className={`size-4.5 shrink-0 ${currentFeedback === "moreLikeThis" ? "fill-current text-primary" : ""}`}
          />
        </AriaButton>
      </HoverTooltip>
      <HoverTooltip label={t("notInterested")}>
        <AriaButton
          type="button"
          onPress={() => {
            if (!pending) void submit("notInterested");
          }}
          aria-disabled={pending || undefined}
          aria-label={t("notInterested")}
          className={`${mediaActionButtonVariants()} border-l border-border/60 ${pending ? "!cursor-not-allowed opacity-70" : ""}`}
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
