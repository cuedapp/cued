"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateAiConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef } from "@/components/setup-wizard-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
const models = {
  openai: ["gpt-6-luna", "gpt-5.6-luna", "gpt-5-nano", "gpt-4o-mini", "gpt-5-mini"],
  openrouter: [
    "openrouter/free",
    "z-ai/glm-5.2:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-5.3-flash",
    "qwen/qwen3.8-flash",
    "openai/gpt-6-luna",
    "openai/gpt-5.6-luna",
  ],
} as const;

export function WizardAiForm({
  locale,
  configurations,
}: {
  locale: string;
  configurations: Record<
    "openai" | "openrouter",
    { hasApiKey: boolean; mode: string; model: string; refreshDelayMinutes: number }
  >;
}) {
  const t = useTranslations("OpenAiIntegration");
  const providerT = useTranslations("AiProviders");
  const wizardT = useTranslations("Wizard");
  const { markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [tested, setTested] = useState(false);
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateAiConfigurationWizard(previous, formData);
    if (result.tested) setTested(true);
    if (result.ok) {
      recordProvider(provider);
      clearDirty();
      navigate(`/${locale}/setup/notifications`);
    }
    return result;
  }, {} as WizardFormState);
  const configuration = configurations[provider];

  function changed() {
    markDirty();
    setTested(false);
  }
  function selectProvider(next: "openai" | "openrouter") {
    setProvider(next);
    setTested(false);
  }

  return (
    <form key={provider} action={action} onChange={changed} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value="save" />
      <input type="hidden" name="provider" value={provider} />
      <SegmentedControl
        value={provider}
        onValueChange={selectProvider}
        label={providerT("provider")}
        options={[
          { value: "openai", label: providerT("providers.openai") },
          { value: "openrouter", label: providerT("providers.openrouter") },
        ]}
      />
      <p className="text-sm text-muted-foreground">{providerT(`providerHelp.${provider}`)}</p>
      <div className="space-y-2">
        <Label htmlFor="wizard-ai-key">{t("apiKey")}</Label>
        <Input
          id="wizard-ai-key"
          name="apiKey"
          type="password"
          placeholder={configuration.hasApiKey ? "••••••••" : undefined}
          autoComplete="off"
          required={!configuration.hasApiKey}
        />
        <p className="text-xs text-muted-foreground">{t("apiKeyHelp")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-ai-model">{t("model")}</Label>
        <select
          id="wizard-ai-model"
          name="model"
          defaultValue={configuration.model}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {!models[provider].includes(configuration.model as never) ? (
            <option value={configuration.model}>{configuration.model}</option>
          ) : null}
          {models[provider].map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-ai-mode">{t("mode")}</Label>
          <select
            id="wizard-ai-mode"
            name="mode"
            defaultValue={configuration.mode}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {["off", "conservative", "balanced", "enhanced"].map((mode) => (
              <option key={mode} value={mode}>
                {t(`modeLabels.${mode}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-ai-delay">{wizardT("form.refreshDelay")}</Label>
          <select
            id="wizard-ai-delay"
            name="refreshDelayMinutes"
            defaultValue={configuration.refreshDelayMinutes}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {[0, 5, 15, 30].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {wizardT("form.error")}
        </p>
      ) : null}
      {tested ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {wizardT("form.connectionVerified")}
        </p>
      ) : null}
    </form>
  );
}
