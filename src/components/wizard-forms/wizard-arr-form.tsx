"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateArrConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef, useWizardPending } from "@/components/setup-wizard-shell";
import { interceptAcquisitionSubmit, markFormTouched, reportBatchResult } from "@/components/wizard-forms/batch-save";
import { keepFormValues, WizardTestButton } from "@/components/wizard-forms/wizard-test-button";

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
  const { ready, markDirty, clearDirty, navigate, recordProvider, saveAndContinue } = useDirtyRef();
  const formRef = useRef<HTMLFormElement>(null);
  const [tested, setTested] = useState(false);
  const [options, setOptions] = useState<WizardFormState["options"]>();
  const [rootFolderPath, setRootFolderPath] = useState(overview.rootFolderPath ?? "");
  const [qualityProfileId, setQualityProfileId] = useState(overview.qualityProfileId?.toString() ?? "");
  const [tagIds, setTagIds] = useState(overview.tagIds);
  const [state, action, pending] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateArrConfigurationWizard(previous, formData);
    const discovered = result.options;
    if (discovered) {
      setOptions(discovered);
      setRootFolderPath((current) => current || discovered.rootFolders[0]?.path || "");
      setQualityProfileId((current) => current || discovered.qualityProfiles[0]?.id.toString() || "");
    }
    if (result.tested) {
      setTested(true);
      toast.success(t("results.connected"));
    }
    if (result.error) {
      setTested(false);
      toast.error(t(`errors.${result.error}`));
    }
    if (formData.get("intent") === "save") {
      if (result.ok) {
        recordProvider(provider);
        toast.success(t("results.saved"));
        if (!reportBatchResult(formRef.current, true)) {
          clearDirty();
          navigate(`/${locale}/setup/ai`);
        }
      } else {
        markDirty();
        reportBatchResult(formRef.current, false);
      }
    }
    return result;
  }, {} as WizardFormState);
  useWizardPending(pending);

  function changed(event: ChangeEvent<HTMLFormElement>) {
    markFormTouched(formRef.current);
    markDirty();
    if (["baseUrl", "apiKey"].includes(event.target.name)) setTested(false);
  }
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => interceptAcquisitionSubmit(event, saveAndContinue)}
      onChange={changed}
      onReset={keepFormValues}
      className="space-y-4"
    >
      <fieldset disabled={!ready || pending} className="min-w-0 space-y-4">
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {wizardT("buttons.continue")}
        </button>
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
                <Label htmlFor={`${provider}-wizard-root`}>{t("rootFolder")}</Label>
                <select
                  id={`${provider}-wizard-root`}
                  name="rootFolderPath"
                  value={rootFolderPath}
                  onChange={(event) => setRootFolderPath(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3"
                >
                  {!options.rootFolders.some((item) => item.path === rootFolderPath) ? (
                    <option value={rootFolderPath}>{rootFolderPath || t("rootFolder")}</option>
                  ) : null}
                  {options.rootFolders.map((item) => (
                    <option key={item.id} value={item.path}>
                      {item.path}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${provider}-wizard-profile`}>{t("qualityProfile")}</Label>
                <select
                  id={`${provider}-wizard-profile`}
                  name="qualityProfileId"
                  value={qualityProfileId}
                  onChange={(event) => setQualityProfileId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3"
                >
                  {!options.qualityProfiles.some((item) => item.id.toString() === qualityProfileId) ? (
                    <option value={qualityProfileId}>{qualityProfileId || t("qualityProfile")}</option>
                  ) : null}
                  {options.qualityProfiles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {options.tags.length > 0 ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("tags")}</legend>
                <div className="flex flex-wrap gap-2">
                  {options.tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="tagIds"
                        value={tag.id}
                        checked={tagIds.includes(tag.id)}
                        onChange={(event) =>
                          setTagIds((current) =>
                            event.target.checked ? [...current, tag.id] : current.filter((id) => id !== tag.id),
                          )
                        }
                      />
                      {tag.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
          </>
        ) : (
          <>
            <input type="hidden" name="rootFolderPath" value={rootFolderPath} />
            <input type="hidden" name="qualityProfileId" value={qualityProfileId} />
          </>
        )}
        {tagIds
          .filter((id) => !options?.tags.some((tag) => tag.id === id))
          .map((id) => (
            <input key={id} type="hidden" name="tagIds" value={id} />
          ))}
        <label className="flex items-center gap-3 rounded-xl border border-border p-3">
          <input type="checkbox" name="searchOnAdd" defaultChecked={overview.searchOnAdd} />
          {t("searchOnAdd")}
        </label>
        {provider === "sonarr" ? (
          <div className="space-y-2">
            <Label htmlFor={`${provider}-wizard-monitor`}>{t("seriesMonitor")}</Label>
            <select
              id={`${provider}-wizard-monitor`}
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
          </div>
        ) : (
          <input type="hidden" name="seriesMonitor" value={overview.seriesMonitor} />
        )}
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
