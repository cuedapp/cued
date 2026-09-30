"use client";

import { createContext, useActionState, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  checkStrmSeriesUpdates,
  compareStrmSeriesSources,
  syncStrmSeries,
  type StrmSeriesCheckState,
  type StrmSeriesCompareState,
  type StrmSeriesSyncState,
} from "./actions";

const SyncActionContext = createContext<((formData: FormData) => void) | null>(null);

export function StrmSeriesSyncFeedback({ children }: { children: ReactNode }) {
  const t = useTranslations("M3uEditorIntegration");
  const [state, action] = useActionState(syncStrmSeries, {} as StrmSeriesSyncState);

  useEffect(() => {
    if (state.error) toast.error(t(`seriesErrors.${state.error}`));
    if (state.result) {
      const notify = state.result.jellyfinRefresh === "failed" ? toast.warning : toast.success;
      notify(t("seriesSynced", { added: state.result.added, updated: state.result.updated }), {
        description: t(`seriesScan.${state.result.jellyfinRefresh}`),
      });
    }
  }, [state, t]);

  return <SyncActionContext.Provider value={action}>{children}</SyncActionContext.Provider>;
}

export function StrmSeriesCheckForm({ locale, disabled }: { locale: string; disabled: boolean }) {
  const t = useTranslations("M3uEditorIntegration");
  const [state, action] = useActionState(checkStrmSeriesUpdates, {} as StrmSeriesCheckState);

  useEffect(() => {
    if (state.error) toast.error(t(`seriesErrors.${state.error}`));
    if (state.result) toast.success(t("seriesChecked"));
  }, [state, t]);

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <FormSubmitButton disabled={disabled} variant="outline" pendingLabel={t("checkingSeries")}>
        {t("checkSeries")}
      </FormSubmitButton>
    </form>
  );
}

export function StrmSeriesSyncForm({
  locale,
  tmdbId,
  sources,
  externalId,
  secondaryExternalId,
  managed = false,
  disabled,
}: {
  locale: string;
  tmdbId: number;
  sources: Array<{ externalId: string; title: string; groupName: string | null }>;
  externalId?: string;
  secondaryExternalId?: string | null;
  managed?: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("M3uEditorIntegration");
  const [comparison, compareAction] = useActionState(compareStrmSeriesSources, {} as StrmSeriesCompareState);
  const [primaryId, setPrimaryId] = useState(externalId ?? "");
  const [secondaryId, setSecondaryId] = useState(secondaryExternalId ?? "");
  useEffect(() => {
    if (comparison.error) toast.error(t(`seriesErrors.${comparison.error}`));
  }, [comparison, t]);
  const action = useContext(SyncActionContext);
  if (!action) throw new Error("STRM series form requires feedback provider");
  const sourceLabel = (source: (typeof sources)[number]) =>
    source.groupName ? `${source.title} — ${source.groupName}` : source.title;
  const availableIds = new Set(sources.map((source) => source.externalId));
  const selectedPrimaryId = primaryId || (!managed && sources.length === 1 ? sources[0]!.externalId : "");
  const primaryAvailable = availableIds.has(selectedPrimaryId);
  const secondaryAvailable = !secondaryId || availableIds.has(secondaryId);
  const sameSource = Boolean(selectedPrimaryId && secondaryId && selectedPrimaryId === secondaryId);
  const canSync = sources.length > 0 && primaryAvailable && secondaryAvailable && !sameSource;
  const showPrimarySelect = sources.length > 1 || Boolean(managed && externalId && !availableIds.has(externalId));
  const showSecondarySelect =
    sources.length > 1 || Boolean(managed && secondaryExternalId && !availableIds.has(secondaryExternalId));
  const savedPrimaryUnavailable = Boolean(managed && externalId && !availableIds.has(externalId));
  const savedSecondaryUnavailable = Boolean(managed && secondaryExternalId && !availableIds.has(secondaryExternalId));

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tmdbId" value={tmdbId} />
      {showPrimarySelect ? (
        <label className="flex min-w-48 flex-col gap-1 text-sm">
          <span>{t("primarySeriesSource")}</span>
          <select
            name="externalId"
            required
            value={primaryId}
            onChange={(event) => {
              const nextPrimaryId = event.target.value;
              setPrimaryId(nextPrimaryId);
              if (nextPrimaryId === secondaryId) setSecondaryId("");
            }}
            className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            {!managed && (
              <option value="" disabled>
                {t("selectSeriesSource")}
              </option>
            )}
            {savedPrimaryUnavailable && externalId && (
              <option value={externalId} disabled>
                {t("savedSeriesSourceUnavailable", { id: externalId })}
              </option>
            )}
            {sources.map((source) => (
              <option key={source.externalId} value={source.externalId}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
        </label>
      ) : sources.length > 0 ? (
        <>
          <input type="hidden" name="externalId" value={selectedPrimaryId} />
          <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm">
            <span className="text-muted-foreground">{t("primarySeriesSource")}:</span>
            {sourceLabel(sources.find((source) => source.externalId === selectedPrimaryId) ?? sources[0]!)}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">{t("noSeriesSource")}</span>
      )}
      {showSecondarySelect && (
        <label className="flex min-w-48 flex-col gap-1 text-sm">
          <span>{t("secondarySeriesSource")}</span>
          <select
            name="secondaryExternalId"
            value={secondaryId}
            onChange={(event) => setSecondaryId(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">{t("noSecondarySeriesSource")}</option>
            {savedSecondaryUnavailable && secondaryExternalId && (
              <option value={secondaryExternalId} disabled>
                {t("savedSeriesSourceUnavailable", { id: secondaryExternalId })}
              </option>
            )}
            {sources
              .filter((source) => source.externalId !== selectedPrimaryId)
              .map((source) => (
                <option key={source.externalId} value={source.externalId}>
                  {sourceLabel(source)}
                </option>
              ))}
          </select>
        </label>
      )}
      {showSecondarySelect && <p className="basis-full text-sm text-muted-foreground">{t("sourceMergeHelp")}</p>}
      {showSecondarySelect && sources.length > 1 && (
        <FormSubmitButton
          formAction={compareAction}
          variant="outline"
          disabled={disabled || !canSync}
          pendingLabel={t("checkingSourceCoverage")}
        >
          {t("compareSources")}
        </FormSubmitButton>
      )}
      {comparison.result && (
        <p aria-live="polite" className="basis-full text-sm text-muted-foreground">
          {t("sourceCoverage", comparison.result)}
        </p>
      )}
      <FormSubmitButton disabled={disabled || !canSync} pendingLabel={t("syncingSeries")}>
        {managed ? t("syncSeries") : t("adoptSeries")}
      </FormSubmitButton>
    </form>
  );
}
