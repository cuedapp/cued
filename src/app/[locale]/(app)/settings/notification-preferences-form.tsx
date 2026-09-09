"use client";
import { useActionState, useEffect } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateNotificationPreferences, type NotificationFormState } from "./actions";

type Preferences = {
  baseUrl: string;
  topic: string;
  strongRecommendations: boolean;
  followedRequestable: boolean;
  newSeasons: boolean;
  persistentFailures: boolean;
  updates: boolean;
  minimumMatch: number;
  failureThreshold: number;
  hasToken: boolean;
  encryptionConfigured: boolean;
};

export function NotificationPreferencesForm({ preferences, isAdmin }: { preferences: Preferences; isAdmin: boolean }) {
  const t = useTranslations("Settings");
  const [state, action] = useActionState(updateNotificationPreferences, {} as NotificationFormState);
  useEffect(() => {
    if (state.error) toast.error(t(`notificationErrors.${state.error}`));
    if (state.result) toast.success(t(`notificationResults.${state.result}`));
  }, [state, t]);
  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">{t("notificationConnection")}</legend>
        <p className="text-sm text-muted-foreground">{t("notificationConnectionHelp")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="ntfyBaseUrl">{t("ntfyBaseUrl")}</Label><Input id="ntfyBaseUrl" name="baseUrl" type="url" defaultValue={preferences.baseUrl} required /></div>
          <div className="space-y-2"><Label htmlFor="ntfyTopic">{t("ntfyTopic")}</Label><Input id="ntfyTopic" name="topic" defaultValue={preferences.topic} placeholder={t("ntfyTopicPlaceholder")} /></div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ntfyToken">{t("ntfyToken")}</Label>
          <Input id="ntfyToken" name="token" type="password" placeholder={preferences.hasToken ? "••••••••••••" : t("ntfyTokenOptional")} disabled={!preferences.encryptionConfigured} autoComplete="off" />
          <p className="text-xs text-muted-foreground">{preferences.encryptionConfigured ? t("ntfyTokenHelp") : t("ntfyEncryptionHelp")}</p>
        </div>
      </fieldset>
      <NotificationGroup title={t("notificationPersonal")} description={t("notificationPersonalHelp")}>
        <NotificationToggle name="strongRecommendations" label={t("strongRecommendations")} description={t("strongRecommendationsHelp")} checked={preferences.strongRecommendations} />
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-end">
          <div><p className="text-sm font-medium">{t("minimumMatch")}</p><p className="mt-1 text-xs text-muted-foreground">{t("minimumMatchHelp")}</p></div>
          <input type="number" name="minimumMatch" min="50" max="100" defaultValue={preferences.minimumMatch} className="h-10 rounded-lg border border-input bg-background px-3" />
        </div>
      </NotificationGroup>
      <NotificationGroup title={t("notificationFollowing")} description={t("notificationFollowingHelp")}>
        <NotificationToggle name="followedRequestable" label={t("followedRequestable")} description={t("followedRequestableHelp")} checked={preferences.followedRequestable} />
        <NotificationToggle name="newSeasons" label={t("newSeasons")} description={t("newSeasonsHelp")} checked={preferences.newSeasons} />
      </NotificationGroup>
      {isAdmin && <NotificationGroup title={t("notificationAdministration")} description={t("notificationAdministrationHelp")}>
        <NotificationToggle name="persistentFailures" label={t("persistentFailures")} description={t("persistentFailuresHelp")} checked={preferences.persistentFailures} />
        <NotificationToggle name="updates" label={t("updates")} description={t("updatesHelp")} checked={preferences.updates} />
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-end"><div><p className="text-sm font-medium">{t("failureThreshold")}</p><p className="mt-1 text-xs text-muted-foreground">{t("failureThresholdHelp")}</p></div><input type="number" name="failureThreshold" min="1" max="20" defaultValue={preferences.failureThreshold} className="h-10 rounded-lg border border-input bg-background px-3" /></div>
      </NotificationGroup>}
      {!isAdmin && <input type="hidden" name="failureThreshold" value={preferences.failureThreshold} />}
      <div className="flex flex-wrap gap-3">
        <FormSubmitButton name="intent" value="save" pendingLabel={t("savingNotifications")}>
          {t("saveNotifications")}
        </FormSubmitButton>
        <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testingNotifications")}>
          {t("testNotifications")}
        </FormSubmitButton>
      </div>
    </form>
  );
}

function NotificationGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <fieldset className="space-y-3 rounded-xl border border-border p-4"><legend className="px-1 text-sm font-semibold">{title}</legend><p className="text-sm text-muted-foreground">{description}</p>{children}</fieldset>;
}

function NotificationToggle({ name, label, description, checked }: { name: string; label: string; description: string; checked: boolean }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/60"><input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5 size-4 cursor-pointer accent-primary" /><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span></label>;
}
