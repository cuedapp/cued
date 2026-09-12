"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { CardFooter } from "@/components/ui/card";
import { updateInAppNotificationPreferences, type InAppNotificationFormState } from "./actions";

type Preferences = {
  recommendationUpdates: boolean;
  requestUpdates: boolean;
  requestAvailabilityUpdates: boolean;
  followingUpdates: boolean;
};

export function NotificationPreferencesForm({ preferences }: { preferences: Preferences }) {
  const t = useTranslations("Settings");
  const [state, action] = useActionState(updateInAppNotificationPreferences, {} as InAppNotificationFormState);

  useEffect(() => {
    if (state.result) toast.success(t("notificationResults.saved"));
  }, [state, t]);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="space-y-3 px-6 pb-6">
        <NotificationToggle
          name="recommendationUpdates"
          label={t("strongRecommendations")}
          description={t("strongRecommendationsHelp")}
          checked={preferences.recommendationUpdates}
        />
        <NotificationToggle
          name="requestUpdates"
          label={t("requestUpdates")}
          description={t("requestUpdatesHelp")}
          checked={preferences.requestUpdates}
        />
        <NotificationToggle
          name="requestAvailabilityUpdates"
          label={t("requestAvailabilityUpdates")}
          description={t("requestAvailabilityUpdatesHelp")}
          checked={preferences.requestAvailabilityUpdates}
        />
        <NotificationToggle
          name="followingUpdates"
          label={t("followingUpdates")}
          description={t("followingUpdatesHelp")}
          checked={preferences.followingUpdates}
        />
      </div>
      <CardFooter className="mt-auto justify-end">
        <FormSubmitButton pendingLabel={t("savingNotifications")}>{t("saveNotifications")}</FormSubmitButton>
      </CardFooter>
    </form>
  );
}

function NotificationToggle({
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
