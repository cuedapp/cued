"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { saveMediaFeedback } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";

const tags = ["fun", "noBrainerAction", "comfortWatch", "greatCharacters", "smart", "moving", "suspenseful", "feelGood", "exciting", "rewatchable", "tooSlow", "tooLong", "tooDark", "boring", "notForMe"] as const;

export function RatingForm({ mediaItemId, rating, feedback, tags: selectedTags, excluded, tagOrder = [] }: { mediaItemId: string; rating: number | null; feedback: string | null; tags: string[]; excluded: boolean | null; tagOrder?: string[] }) {
  const t = useTranslations("History");
  const [selectedRating, setSelectedRating] = useState(rating ?? 0);
  const [showAllTags, setShowAllTags] = useState(false);
  const [state, action] = useActionState(saveMediaFeedback, {});
  const orderedTags = [...tags].sort((a, b) => {
    const aIndex = tagOrder.indexOf(a);
    const bIndex = tagOrder.indexOf(b);
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });
  const visibleTags = showAllTags ? orderedTags : orderedTags.filter((tag, index) => index < 6 || selectedTags.includes(tag));
  useEffect(() => { if (state.error) toast.error(t(`errors.${state.error}`)); }, [state.error, t]);
  return <form action={action} className="mt-4 grid gap-4 border-t border-border/60 pt-4 sm:mt-5 sm:pt-5">
    <input type="hidden" name="mediaItemId" value={mediaItemId} />
    <input type="hidden" name="rating" value={selectedRating || ""} />
    <div><div className="text-sm font-medium">{t("rating")}</div><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setSelectedRating(value === selectedRating ? 0 : value)} aria-label={t("stars", { count: value })} className="cursor-pointer rounded p-1 text-amber-500 outline-none focus-visible:ring-2 focus-visible:ring-ring"><Star className={`size-6 ${value <= selectedRating ? "fill-current" : ""}`} /></button>)}</div></div>
    <fieldset><legend className="text-sm font-medium">{t("tags")}</legend><div className="mt-2 flex flex-wrap gap-2">{visibleTags.map((tag) => <label key={tag} className="cursor-pointer"><input type="checkbox" name="tags" value={tag} defaultChecked={selectedTags.includes(tag)} className="peer sr-only" /><span className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">{t(`tag.${tag}`)}</span></label>)}</div>{orderedTags.length > 6 && <button type="button" onClick={() => setShowAllTags((value) => !value)} className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded text-sm font-medium text-primary hover:underline">{showAllTags ? <><ChevronUp className="size-4" />{t("showFewerTags")}</> : <><ChevronDown className="size-4" />{t("showMoreTags", { count: orderedTags.length - visibleTags.length })}</>}</button>}</fieldset>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="grid gap-1 text-sm font-medium"><span>{t("feedback")}</span><input name="feedback" defaultValue={feedback ?? ""} maxLength={1000} placeholder={t("feedbackPlaceholder")} className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm" /></label><div className="grid gap-3 sm:flex sm:items-end"><label className="flex min-h-10 items-center gap-2 text-sm"><input name="excluded" type="checkbox" defaultChecked={excluded ?? false} className="size-4 accent-primary" />{t("exclude")}</label><FormSubmitButton className="w-full cursor-pointer sm:w-auto" pendingLabel={t("saving")}>{t("save")}</FormSubmitButton></div></div>
  </form>;
}
