"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateTmdbConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef, useWizardPending } from "@/components/setup-wizard-shell";
import { keepFormValues, WizardTestButton } from "@/components/wizard-forms/wizard-test-button";

export function WizardTmdbForm({ locale, hasAccessToken }: { locale: string; hasAccessToken: boolean }) {
  const t = useTranslations("TmdbIntegration");
  const wizardT = useTranslations("Wizard");
  const { ready, markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [tested, setTested] = useState(false);
  const [state, action, pending] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateTmdbConfigurationWizard(previous, formData);
    setTested(Boolean(result.tested));
    if (result.ok) {
      recordProvider("tmdb");
      clearDirty();
      navigate(`/${locale}/setup/acquisition`);
    }
    return result;
  }, {} as WizardFormState);
  useWizardPending(pending);

  function changed() {
    markDirty();
    setTested(false);
  }

  return (
    <form action={action} onChange={changed} onReset={keepFormValues} className="space-y-5">
      <fieldset disabled={!ready || pending} className="min-w-0 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="save" />
        <div className="space-y-2">
          <Label htmlFor="wizard-tmdb-token">{t("accessToken")}</Label>
          <Input
            id="wizard-tmdb-token"
            name="accessToken"
            type="password"
            placeholder={hasAccessToken ? "••••••••" : undefined}
            autoComplete="off"
            required={!hasAccessToken}
          />
          {hasAccessToken ? <p className="text-xs text-muted-foreground">{t("accessTokenHelp")}</p> : null}
        </div>
        <WizardTestButton label={t("test")} pendingLabel={t("testing")} />
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
      </fieldset>
    </form>
  );
}
