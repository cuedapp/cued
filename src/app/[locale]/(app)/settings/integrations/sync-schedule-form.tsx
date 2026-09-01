"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateSyncSchedule, type ScheduleFormState } from "./actions";

export function SyncScheduleForm({
  provider,
  locale,
  minutes,
  disabled = false,
}: {
  provider: "jellyfin" | "m3u-editor";
  locale: string;
  minutes: number;
  disabled?: boolean;
}) {
  const t = useTranslations("Integrations");
  const [state, action] = useActionState(updateSyncSchedule, {} as ScheduleFormState);
  useEffect(() => {
    if (state.result) toast.success(t("scheduleSaved"));
    if (state.error) toast.error(t("scheduleFailed"));
  }, [state, t]);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="locale" value={locale} />
      <label className="grid min-w-56 gap-2 text-sm font-medium">
        {t("scheduleInterval")}
        <select
          name="minutes"
          defaultValue={minutes}
          disabled={disabled}
          className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="0">{t("scheduleOptions.off")}</option>
          <option value="15">{t("scheduleOptions.15")}</option>
          <option value="30">{t("scheduleOptions.30")}</option>
          <option value="60">{t("scheduleOptions.60")}</option>
          <option value="360">{t("scheduleOptions.360")}</option>
          <option value="720">{t("scheduleOptions.720")}</option>
          <option value="1440">{t("scheduleOptions.1440")}</option>
        </select>
      </label>
      <FormSubmitButton disabled={disabled} pendingLabel={t("saving")}>
        {t("saveSchedule")}
      </FormSubmitButton>
    </form>
  );
}
