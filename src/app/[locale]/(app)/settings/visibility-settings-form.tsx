"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { CardFooter } from "@/components/ui/card";
import { updateVisibilitySettings, type VisibilitySettingsFormState } from "./actions";

type Settings = {
  showServerStatisticsToUsers: boolean;
  showRecentActivityToUsers: boolean;
  showWatchingNowToUsers: boolean;
};

export function VisibilitySettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations("Settings");
  const [state, action] = useActionState(updateVisibilitySettings, {} as VisibilitySettingsFormState);

  useEffect(() => {
    if (state.result === "saved") toast.success(t("visibilitySaved"));
  }, [state, t]);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="space-y-3 px-6 pb-6">
        <VisibilityToggle
          name="showServerStatisticsToUsers"
          label={t("showServerStatistics")}
          description={t("showServerStatisticsHelp")}
          checked={settings.showServerStatisticsToUsers}
        />
        <VisibilityToggle
          name="showRecentActivityToUsers"
          label={t("showRecentActivity")}
          description={t("showRecentActivityHelp")}
          checked={settings.showRecentActivityToUsers}
        />
        <VisibilityToggle
          name="showWatchingNowToUsers"
          label={t("showWatchingNow")}
          description={t("showWatchingNowHelp")}
          checked={settings.showWatchingNowToUsers}
        />
      </div>
      <CardFooter className="mt-auto justify-end">
        <FormSubmitButton pendingLabel={t("savingVisibility")}>{t("saveVisibility")}</FormSubmitButton>
      </CardFooter>
    </form>
  );
}

function VisibilityToggle({
  name,
  label,
  description,
  checked,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/60">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-1 size-4 cursor-pointer accent-primary"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
