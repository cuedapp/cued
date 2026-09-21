"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateNtfyConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef } from "@/components/setup-wizard-shell";

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
  const { markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [tested, setTested] = useState(false);
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateNtfyConfigurationWizard(previous, formData);
    if (result.tested) setTested(true);
    if (result.ok) {
      recordProvider("ntfy");
      clearDirty();
      navigate(`/${locale}/setup/review`);
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
