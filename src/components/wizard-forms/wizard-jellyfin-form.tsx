"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateJellyfinConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef } from "@/components/setup-wizard-shell";

export function WizardJellyfinForm({
  locale,
  baseUrl = "",
  externalUrl,
  hasApiKey,
}: {
  locale: string;
  baseUrl?: string;
  externalUrl?: string;
  hasApiKey: boolean;
}) {
  const t = useTranslations("Integrations");
  const wizardT = useTranslations("Wizard");
  const router = useRouter();
  const { markDirty, clearDirty, recordProvider } = useDirtyRef();
  const [baseUrlValue, setBaseUrlValue] = useState(baseUrl);
  const [externalUrlValue, setExternalUrlValue] = useState(externalUrl ?? "");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [tested, setTested] = useState(false);
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateJellyfinConfigurationWizard(previous, formData);
    if (result.tested) setTested(true);
    if (result.ok) {
      recordProvider("jellyfin");
      clearDirty();
      router.refresh();
    }
    return result;
  }, {} as WizardFormState);

  function changed() {
    markDirty();
    setTested(false);
  }

  return (
    <form action={action} onChange={changed} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-2">
        <Label htmlFor="wizard-jellyfin-url">{t("url")}</Label>
        <Input
          id="wizard-jellyfin-url"
          name="baseUrl"
          type="url"
          value={baseUrlValue}
          onChange={(event) => {
            setBaseUrlValue(event.target.value);
            changed();
          }}
          placeholder="http://jellyfin:8096"
          required
          autoComplete="url"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-jellyfin-external">{t("externalUrl")}</Label>
        <Input
          id="wizard-jellyfin-external"
          name="externalUrl"
          type="url"
          value={externalUrlValue}
          onChange={(event) => {
            setExternalUrlValue(event.target.value);
            changed();
          }}
          placeholder="https://jellyfin.example.com"
          autoComplete="url"
        />
        <p className="text-xs text-muted-foreground">{t("externalUrlHelp")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-jellyfin-key">{t("apiKey")}</Label>
        <Input
          id="wizard-jellyfin-key"
          name="apiKey"
          type="password"
          value={apiKeyValue}
          onChange={(event) => {
            setApiKeyValue(event.target.value);
            changed();
          }}
          placeholder={hasApiKey ? "••••••••" : undefined}
        />
        {hasApiKey ? <p className="text-xs text-muted-foreground">{t("apiKeyHelp")}</p> : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {tested ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {wizardT("form.connectionVerified")}
        </p>
      ) : null}
      <div className="flex justify-end border-t border-border pt-4">
        <FormSubmitButton name="intent" value="save" pendingLabel={wizardT("form.loadingLibraries")}>
          {wizardT("form.loadLibraries")}
        </FormSubmitButton>
      </div>
    </form>
  );
}
