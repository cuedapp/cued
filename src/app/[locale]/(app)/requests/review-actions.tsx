"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { reviewAcquisitionRequest, type ReviewRequestState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export function ReviewActions({
  id,
  locale,
  rootFolders,
  qualityProfiles,
  defaultRootFolderPath,
  defaultProfileId,
}: {
  id: string;
  locale: string;
  rootFolders: Array<{ id: number; path: string }>;
  qualityProfiles: Array<{ id: number; name: string }>;
  defaultRootFolderPath?: string;
  defaultProfileId?: number;
}) {
  const t = useTranslations("Requests");
  const [state, action] = useActionState(reviewAcquisitionRequest, {} as ReviewRequestState);
  useEffect(() => {
    if (state.result) toast.success(t(`results.${state.result}`));
    if (state.error) toast.error(t("failed"));
  }, [state, t]);
  return (
    <form action={action} className="grid w-full gap-3 sm:w-auto sm:min-w-96 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
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
      <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
        <FormSubmitButton
          name="decision"
          value="approved"
          pendingLabel={t("approving")}
          disabled={rootFolders.length === 0 || qualityProfiles.length === 0}
        >
          {t("approve")}
        </FormSubmitButton>
        <FormSubmitButton name="decision" value="rejected" variant="outline" pendingLabel={t("rejecting")}>
          {t("reject")}
        </FormSubmitButton>
      </div>
    </form>
  );
}
