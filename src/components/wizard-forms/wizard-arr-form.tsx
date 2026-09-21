"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateArrConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef } from "@/components/setup-wizard-shell";

export function WizardArrForm({
  provider,
  locale,
  overview,
}: {
  provider: "radarr" | "sonarr";
  locale: string;
  overview: {
    baseUrl: string;
    hasApiKey: boolean;
    rootFolderPath?: string;
    qualityProfileId?: number;
    tagIds: number[];
    searchOnAdd: boolean;
    seriesMonitor: string;
  };
}) {
  const t = useTranslations("ArrIntegration");
  const wizardT = useTranslations("Wizard");
  const { markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [tested, setTested] = useState(false);
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateArrConfigurationWizard(previous, formData);
    if (result.tested) setTested(true);
    if (result.ok) {
      recordProvider(provider);
      clearDirty();
      navigate(`/${locale}/setup/ai`);
    }
    return result;
  }, {} as WizardFormState);
  function changed() {
    markDirty();
    setTested(false);
  }
  const options = state.options;
  return (
    <form action={action} onChange={changed} className="space-y-4">
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value="save" />
      <div className="space-y-2">
        <Label htmlFor={`${provider}-wizard-url`}>{t("baseUrl")}</Label>
        <Input
          id={`${provider}-wizard-url`}
          name="baseUrl"
          type="url"
          defaultValue={overview.baseUrl}
          placeholder={provider === "radarr" ? "http://radarr:7878" : "http://sonarr:8989"}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${provider}-wizard-key`}>{t("apiKey")}</Label>
        <Input
          id={`${provider}-wizard-key`}
          name="apiKey"
          type="password"
          placeholder={overview.hasApiKey ? "••••••••" : undefined}
          required={!overview.hasApiKey}
          autoComplete="off"
        />
      </div>
      {options ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("rootFolder")}</Label>
              <select
                name="rootFolderPath"
                defaultValue={overview.rootFolderPath}
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
              >
                {options.rootFolders.map((item) => (
                  <option key={item.id} value={item.path}>
                    {item.path}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t("qualityProfile")}</Label>
              <select
                name="qualityProfileId"
                defaultValue={overview.qualityProfileId}
                className="h-10 w-full rounded-lg border border-input bg-background px-3"
              >
                {options.qualityProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" name="searchOnAdd" defaultChecked={overview.searchOnAdd} />
            {t("searchOnAdd")}
          </label>
          {provider === "sonarr" ? (
            <select
              name="seriesMonitor"
              defaultValue={overview.seriesMonitor}
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
            >
              {["all", "future", "missing", "existing", "firstSeason", "lastSeason", "none"].map((value) => (
                <option key={value} value={value}>
                  {t(`monitor.${value}`)}
                </option>
              ))}
            </select>
          ) : (
            <input type="hidden" name="seriesMonitor" value="all" />
          )}
        </>
      ) : (
        <input type="hidden" name="seriesMonitor" value={provider === "sonarr" ? overview.seriesMonitor : "all"} />
      )}
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
