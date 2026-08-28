"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateOpenAiConfiguration, type OpenAiFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AiMode } from "@/server/integrations/ai/provider";

const modelOptions = [
  { id: "gpt-5.6-luna", translationKey: "luna", input: 0.2, output: 1.2 },
  { id: "gpt-5-nano", translationKey: "nano", input: 0.05, output: 0.4 },
  { id: "gpt-4o-mini", translationKey: "fourOMini", input: 0.15, output: 0.6 },
  { id: "gpt-5-mini", translationKey: "fiveMini", input: 0.25, output: 2 },
] as const;
const customOption = "custom";
const estimatedInputTokens = 10_000;
const estimatedOutputTokens = 2_000;

function estimatedCost(input: number, output: number) {
  return input * estimatedInputTokens / 1_000_000 + output * estimatedOutputTokens / 1_000_000;
}

export function OpenAiIntegrationForm({ locale, encryptionConfigured, hasApiKey, mode, model }: { locale: string; encryptionConfigured: boolean; hasApiKey: boolean; mode: AiMode; model: string }) {
  const t = useTranslations("OpenAiIntegration");
  const [state, action] = useActionState(updateOpenAiConfiguration, {} as OpenAiFormState);
  const knownModel = modelOptions.some((option) => option.id === model);
  const [selectedModel, setSelectedModel] = useState(knownModel ? model : customOption);
  const [customModel, setCustomModel] = useState(knownModel ? "" : model);
  const [selectedMode, setSelectedMode] = useState(mode);
  const [apiKey, setApiKey] = useState("");
  const submittedModel = selectedModel === customOption ? customModel : selectedModel;
  const option = modelOptions.find((candidate) => candidate.id === selectedModel);
  const formatCost = (cost: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: cost < 0.01 ? 3 : 2, maximumFractionDigits: 3 }).format(cost);

  useEffect(() => { if (state.error) toast.error(t(`errors.${state.error}`)); if (state.result) toast.success(t(`results.${state.result}`)); }, [state, t]);

  return <form action={action} className="space-y-5">
    <input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="model" value={submittedModel} />
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
      <Label htmlFor="openAiApiKey">{t("apiKey")}</Label>
      <Input id="openAiApiKey" name="apiKey" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasApiKey ? t("keyStored") : undefined} disabled={!encryptionConfigured} autoComplete="off" />
      <p className="text-xs leading-5 text-muted-foreground">{encryptionConfigured ? t("apiKeyHelp") : t("encryptionHelp")}</p>
    </div>
    <div className="space-y-2">
      <Label htmlFor="openAiModelPreset">{t("model")}</Label>
      <select id="openAiModelPreset" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm">
        {modelOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{t(`models.${candidate.translationKey}.label`)}</option>)}
        <option value={customOption}>{t("models.custom.label")}</option>
      </select>
      {selectedModel === customOption ? <div className="space-y-2 pt-1"><Label htmlFor="openAiCustomModel">{t("customModel")}</Label><Input id="openAiCustomModel" value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="gpt-5.6-luna" /></div> : null}
      <p className="text-xs leading-5 text-muted-foreground">{selectedModel === customOption ? t("models.custom.description") : t(`models.${option!.translationKey}.description`)}</p>
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
    <div className="flex flex-wrap gap-3">
      <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")} disabled={!submittedModel.trim()}>{t("save")}</FormSubmitButton>
      <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")} disabled={(!hasApiKey && !apiKey.trim()) || !submittedModel.trim()}>{t("test")}</FormSubmitButton>
    </div>
  </form>;
}
