"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateNtfyConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef, useWizardPending } from "@/components/setup-wizard-shell";
import { keepFormValues, WizardTestButton } from "@/components/wizard-forms/wizard-test-button";

export function WizardNtfyForm({
  locale,
  overview,
}: {
  locale: string;
  overview: {
    baseUrl: string;
    topic: string;
    hasToken: boolean;
    failureThreshold: number;
    integrationFailures: boolean;
    jobFailures: boolean;
    updates: boolean;
  };
}) {
  const t = useTranslations("NtfyIntegration");
  const wizardT = useTranslations("Wizard");
  const { ready, markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [tested, setTested] = useState(false);
  const [state, action, pending] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateNtfyConfigurationWizard(previous, formData);
    setTested(Boolean(result.tested));
    if (result.ok) {
      recordProvider("ntfy");
      clearDirty();
      navigate(`/${locale}/setup/review`);
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
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {wizardT("buttons.continue")}
        </button>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="save" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("baseUrl")}</Label>
            <Input name="baseUrl" type="url" defaultValue={overview.baseUrl || "https://ntfy.sh"} required />
          </div>
          <div className="space-y-2">
            <Label>{t("topic")}</Label>
            <Input name="topic" defaultValue={overview.topic} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t("token")}</Label>
          <Input
            name="token"
            type="password"
            placeholder={overview.hasToken ? "••••••••" : undefined}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("failureThreshold")}</Label>
          <Input name="failureThreshold" type="number" min={1} max={20} defaultValue={overview.failureThreshold} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle name="integrationFailures" checked={overview.integrationFailures} label={t("integrationFailures")} />
          <Toggle name="jobFailures" checked={overview.jobFailures} label={t("jobFailures")} />
          <Toggle name="updates" checked={overview.updates} label={t("updates")} />
        </div>
        <WizardTestButton label={t("test")} pendingLabel={t("testing")} />
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${state.error}`)}
          </p>
        ) : null}
        {tested ? (
          <p role="status" className="text-sm text-emerald-700">
            {wizardT("form.connectionVerified")}
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}
function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
