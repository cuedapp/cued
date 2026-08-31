"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateOpenAiConfiguration, type OpenAiFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AiMode, AiProviderId } from "@/server/integrations/ai/provider";

const openAiModels = [
  { id: "gpt-5.6-luna", translationKey: "luna", input: 0.2, output: 1.2 },
  { id: "gpt-5-nano", translationKey: "nano", input: 0.05, output: 0.4 },
  { id: "gpt-4o-mini", translationKey: "fourOMini", input: 0.15, output: 0.6 },
  { id: "gpt-5-mini", translationKey: "fiveMini", input: 0.25, output: 2 },
] as const;
const openRouterModels = [
  { id: "openrouter/free", translationKey: "free", input: 0, output: 0 },
  { id: "z-ai/glm-5.2:free", translationKey: "glm52Free", input: 0, output: 0 },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", translationKey: "nemotron3SuperFree", input: 0, output: 0 },
  { id: "z-ai/glm-5.3-flash", translationKey: "glm53Flash", input: 0.075, output: 0.25 },
  { id: "qwen/qwen3.8-flash", translationKey: "qwen38Flash", input: 0.15, output: 0.47 },
  { id: "openai/gpt-5.6-luna", translationKey: "luna", input: 0.2, output: 1.2 },
  { id: "openai/gpt-4o-mini", translationKey: "openRouterFourOMini", input: 0.15, output: 0.6 },
] as const;
const customOption = "custom";
const estimatedInputTokens = 10_000;
const estimatedOutputTokens = 2_000;

function estimatedCost(input: number, output: number) {
  return input * estimatedInputTokens / 1_000_000 + output * estimatedOutputTokens / 1_000_000;
}

type ProviderConfiguration = { hasApiKey: boolean; mode: AiMode; model: string; refreshDelayMinutes: number };

export function OpenAiIntegrationForm({ locale, encryptionConfigured, initialProvider, configurations }: { locale: string; encryptionConfigured: boolean; initialProvider: AiProviderId; configurations: Record<AiProviderId, ProviderConfiguration> }) {
  const t = useTranslations("OpenAiIntegration");
  const providerT = useTranslations("AiProviders");
  const connectionT = useTranslations("AiProviderConnection");
  const refreshDelayT = useTranslations("AiRefreshDelay");
  const openRouterModelT = useTranslations("OpenRouterModels");
  const [state, action] = useActionState(updateOpenAiConfiguration, {} as OpenAiFormState);
  const [provider, setProvider] = useState<AiProviderId>(initialProvider);
  const availableModels = provider === "openrouter" ? openRouterModels : openAiModels;
  const configuration = configurations[provider];
  const knownModel = availableModels.some((option) => option.id === configuration.model);
  const [selectedModel, setSelectedModel] = useState(knownModel ? configuration.model : customOption);
  const [customModel, setCustomModel] = useState(knownModel ? "" : configuration.model);
  const [selectedMode, setSelectedMode] = useState(configuration.mode);
  const [refreshDelayMinutes, setRefreshDelayMinutes] = useState(configuration.refreshDelayMinutes);
  const [apiKey, setApiKey] = useState("");
  const submittedModel = selectedModel === customOption ? customModel : selectedModel;
  const option = availableModels.find((candidate) => candidate.id === selectedModel);
  const formatCost = (cost: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: cost < 0.01 ? 3 : 2, maximumFractionDigits: 3 }).format(cost);

  useEffect(() => {
    if (state.error) toast.error(state.error.startsWith("openrouter") ? connectionT(`errors.${state.error}`) : t(`errors.${state.error}`));
    if (state.result) toast.success(state.result.startsWith("openrouter") ? connectionT(`results.${state.result}`) : t(`results.${state.result}`));
  }, [connectionT, state, t]);
  function selectProvider(nextProvider: AiProviderId) { const next = configurations[nextProvider]; const models = nextProvider === "openrouter" ? openRouterModels : openAiModels; const known = models.some((item) => item.id === next.model); setProvider(nextProvider); setSelectedModel(known ? next.model : customOption); setCustomModel(known ? "" : next.model); setSelectedMode(next.mode); setRefreshDelayMinutes(next.refreshDelayMinutes); setApiKey(""); }

  return <form action={action} onReset={(event) => event.preventDefault()} className="space-y-5">
    <input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="provider" value={provider} />
    <input type="hidden" name="model" value={submittedModel} />
    <div className="space-y-2"><Label htmlFor="aiProvider">{providerT("provider")}</Label><select id="aiProvider" value={provider} onChange={(event) => selectProvider(event.target.value as AiProviderId)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"><option value="openai">{providerT("providers.openai")}</option><option value="openrouter">{providerT("providers.openrouter")}</option></select><p className="text-xs leading-5 text-muted-foreground">{providerT(`providerHelp.${provider}`)}</p></div>
    <div className="space-y-2">
      <Label htmlFor="aiMode">{t("mode")}</Label>
      <select id="aiMode" name="mode" value={selectedMode} onChange={(event) => setSelectedMode(event.target.value as AiMode)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm">
        <option value="off">{t("modeLabels.off")}</option><option value="conservative">{t("modeLabels.conservative")}</option><option value="balanced">{t("modeLabels.balanced")}</option><option value="enhanced">{t("modeLabels.enhanced")}</option>
      </select>
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{t("modeExplanation")}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`modes.${selectedMode}`)}</p>
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor="refreshDelayMinutes">{refreshDelayT("title")}</Label>
      <select id="refreshDelayMinutes" name="refreshDelayMinutes" value={refreshDelayMinutes} onChange={(event) => setRefreshDelayMinutes(Number(event.target.value))} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm">
        {[0, 5, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{refreshDelayT(`options.${minutes}`)}</option>)}
      </select>
      <p className="text-xs leading-5 text-muted-foreground">{refreshDelayT("help")}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="openAiApiKey">{t("apiKey")}</Label>
      <Input id="openAiApiKey" name="apiKey" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={configuration.hasApiKey ? t("keyStored") : undefined} disabled={!encryptionConfigured} autoComplete="off" />
      <p className="text-xs leading-5 text-muted-foreground">{encryptionConfigured ? t("apiKeyHelp") : t("encryptionHelp")}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="openAiModelPreset">{t("model")}</Label>
      <select id="openAiModelPreset" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm">
        {availableModels.map((candidate) => <option key={candidate.id} value={candidate.id}>{provider === "openrouter" ? openRouterModelT(`${candidate.translationKey}.label`) : t(`models.${candidate.translationKey}.label`)}</option>)}
        <option value={customOption}>{t("models.custom.label")}</option>
      </select>
      {selectedModel === customOption ? <div className="space-y-2 pt-1"><Label htmlFor="openAiCustomModel">{t("customModel")}</Label><Input id="openAiCustomModel" value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder={provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-5.6-luna"} /></div> : null}
      <p className="text-xs leading-5 text-muted-foreground">{selectedModel === customOption ? t("models.custom.description") : provider === "openrouter" ? openRouterModelT(`${option!.translationKey}.description`) : t(`models.${option!.translationKey}.description`)}</p>
      {option ? <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{t("costEstimate")}</p>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-muted-foreground">{t("costDay")}</dt><dd className="mt-1 font-semibold">{formatCost(estimatedCost(option.input, option.output))}</dd></div>
          <div><dt className="text-muted-foreground">{t("costWeek")}</dt><dd className="mt-1 font-semibold">{formatCost(estimatedCost(option.input, option.output) * 7)}</dd></div>
          <div><dt className="text-muted-foreground">{t("costMonth")}</dt><dd className="mt-1 font-semibold">{formatCost(estimatedCost(option.input, option.output) * 30)}</dd></div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("costHelp")}</p>
      </div> : null}
    </div>
    <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-sm font-medium">{providerT("privacyTitle")}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{providerT(`privacy.${provider}`)}</p></div>
    <div className="flex flex-wrap gap-3">
      <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")} disabled={!submittedModel.trim()}>{t("save")}</FormSubmitButton>
      <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")} disabled={(!configuration.hasApiKey && !apiKey.trim()) || !submittedModel.trim()}>{t("test")}</FormSubmitButton>
    </div>
  </form>;
}
