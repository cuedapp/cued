"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { reviewAcquisitionRequest, type ReviewRequestState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PendingRequestRemovalButton } from "@/components/pending-request-removal-button";
import { Button } from "@/components/ui/button";

export function ReviewActions({
  id,
  locale,
  type,
  tmdbId,
  title,
  rootFolders,
  qualityProfiles,
  defaultRootFolderPath,
  defaultProfileId,
  mode = "pending",
  onCancel,
}: {
  id: string;
  locale: string;
  type: "movie" | "series";
  tmdbId: number;
  title?: string;
  rootFolders: Array<{ id: number; path: string }>;
  qualityProfiles: Array<{ id: number; name: string }>;
  defaultRootFolderPath?: string;
  defaultProfileId?: number;
  mode?: "pending" | "rejected";
  onCancel?: () => void;
}) {
  const t = useTranslations("Requests");
  const [state, action] = useActionState(reviewAcquisitionRequest, {} as ReviewRequestState);
  useEffect(() => {
    if (state.result) toast.success(t(`results.${state.result}`));
    if (state.error) toast.error(t("failed"));
  }, [state, t]);
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="title" value={title ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
          <span>{t("rootFolder")}</span>
          <select
            name="rootFolderPath"
            defaultValue={defaultRootFolderPath ?? rootFolders[0]?.path}
            className="h-10 min-w-0 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {rootFolders.map((folder) => (
              <option key={folder.id} value={folder.path}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
          <span>{t("qualityProfile")}</span>
          <select
            name="qualityProfileId"
            defaultValue={defaultProfileId ?? qualityProfiles[0]?.id}
            className="h-10 min-w-0 cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {qualityProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 -mx-3 -mb-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-3 py-3">
        {mode === "pending" ? <PendingRequestRemovalButton type={type} tmdbId={tmdbId} compact /> : <span />}
        <div className="ml-auto flex flex-wrap gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
          {mode === "pending" && (
            <FormSubmitButton name="decision" value="rejected" variant="outline" pendingLabel={t("rejecting")}>
              {t("reject")}
            </FormSubmitButton>
          )}
          <FormSubmitButton
            name="decision"
            value={mode === "pending" ? "approved" : "reapproved"}
            pendingLabel={t("approving")}
            disabled={rootFolders.length === 0 || qualityProfiles.length === 0}
          >
            {mode === "pending" ? t("approve") : t("approveNow")}
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
