"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CardFooter } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateNtfyConfiguration, type NtfyFormState } from "./actions";

export function NtfyForm({
  locale,
  overview,
}: {
  locale: string;
  overview: Awaited<
    ReturnType<typeof import("@/server/application/notification.service").NotificationService.prototype.getNtfyOverview>
  >;
}) {
  const t = useTranslations("NtfyIntegration");
  const [state, action] = useActionState(updateNtfyConfiguration, {} as NtfyFormState);
  const [integrationFailuresEnabled, setIntegrationFailuresEnabled] = useState(overview.integrationFailures);
  useEffect(() => {
    if (state.error) toast.error(t(`errors.${state.error}`));
    if (state.result) toast.success(t(`results.${state.result}`));
  }, [state, t]);
  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-5 px-6 pb-6">
        <div className="space-y-2">
          <Label htmlFor="ntfy-url">{t("baseUrl")}</Label>
          <Input id="ntfy-url" name="baseUrl" type="url" defaultValue={overview.baseUrl} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ntfy-topic">{t("topic")}</Label>
          <Input
            id="ntfy-topic"
            name="topic"
            defaultValue={overview.topic}
            placeholder={t("topicPlaceholder")}
            required
          />
          <p className="text-xs text-muted-foreground">{t("topicHelp")}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ntfy-token">{t("token")}</Label>
          <Input
            id="ntfy-token"
            name="token"
            type="password"
            placeholder={overview.hasToken ? "••••••••" : t("tokenOptional")}
            disabled={!overview.encryptionConfigured}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {overview.encryptionConfigured ? t("tokenHelp") : t("errors.encryption")}
          </p>
        </div>
        <div className="rounded-xl border border-border">
          <label className="flex cursor-pointer items-start gap-3 p-4">
            <input
              name="integrationFailures"
              type="checkbox"
              checked={integrationFailuresEnabled}
              onChange={(event) => setIntegrationFailuresEnabled(event.target.checked)}
              aria-controls="ntfy-failure-threshold"
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">{t("integrationFailures")}</span>
              <span className="text-xs text-muted-foreground">{t("integrationFailuresHelp")}</span>
            </span>
          </label>
          <div
            id="ntfy-failure-threshold"
            aria-disabled={!integrationFailuresEnabled}
            className={`space-y-2 border-t border-border px-4 pb-4 pt-3 transition-opacity sm:ml-7 ${
              integrationFailuresEnabled ? "" : "opacity-60"
            }`}
          >
            <Label
              htmlFor="ntfy-threshold"
              className={!integrationFailuresEnabled ? "text-muted-foreground" : undefined}
            >
              {t("failureThreshold")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {integrationFailuresEnabled ? t("failureThresholdHelp") : t("failureThresholdDisabledHelp")}
            </p>
            <Input
              id="ntfy-threshold"
              name="failureThreshold"
              type="number"
              min="1"
              max="20"
              defaultValue={overview.failureThreshold}
              disabled={!integrationFailuresEnabled}
              className="max-w-xs"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <input
            name="jobFailures"
            type="checkbox"
            defaultChecked={overview.jobFailures}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">{t("jobFailures")}</span>
            <span className="text-xs text-muted-foreground">{t("jobFailuresHelp")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <input
            name="updates"
            type="checkbox"
            defaultChecked={overview.updates}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">{t("updates")}</span>
            <span className="text-xs text-muted-foreground">{t("updatesHelp")}</span>
          </span>
        </label>
      </div>
      <CardFooter className="mt-auto justify-end">
        <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")}>
          {t("test")}
        </FormSubmitButton>
        <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")}>
          {t("save")}
        </FormSubmitButton>
      </CardFooter>
    </form>
  );
}
