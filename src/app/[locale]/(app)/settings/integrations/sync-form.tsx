"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { runManualSync, type SyncFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";

const initialState: SyncFormState = {};

export interface SyncRunProgress {
  id: string;
  status: "running" | "completed" | "failed";
  mode: "full" | "updates";
  phase: string;
  currentLabel: string | null;
  librariesProcessed: number;
  librariesTotal: number;
  itemsProcessed: number;
  usersProcessed: number;
  usersTotal: number;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  error: string | null;
}

export function SyncForm({
  locale,
  disabled,
  initialRun,
}: {
  locale: string;
  disabled: boolean;
  initialRun?: SyncRunProgress;
}) {
  const t = useTranslations("Integrations");
  const [state, action, isPending] = useActionState(runManualSync, initialState);
  const [run, setRun] = useState(initialRun);
  const isRunning = isPending || run?.status === "running";

  useEffect(() => {
    if (state.error) toast.error(t(`syncErrors.${state.error}`));
    if (state.result) toast.success(t(`syncResults.${state.result.mode}`, state.result));
  }, [state, t]);

  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/integrations/jellyfin/sync-status", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { run: SyncRunProgress | null };
        if (data.run) setRun(data.run);
      } catch {
        // A later poll can recover from a transient network interruption.
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isRunning]);

  const progress = useMemo(() => {
    if (!run) return 0;
    const total = run.librariesTotal + run.usersTotal;
    if (run.status === "completed") return 100;
    return total > 0 ? Math.round(((run.librariesProcessed + run.usersProcessed) / total) * 100) : 0;
  }, [run]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-wrap gap-3">
        <FormSubmitButton
          name="mode"
          value="updates"
          disabled={disabled || run?.status === "running"}
          pendingLabel={t("syncing")}
        >
          {t("syncUpdates")}
        </FormSubmitButton>
        <FormSubmitButton
          name="mode"
          value="full"
          variant="outline"
          disabled={disabled || run?.status === "running"}
          pendingLabel={t("syncing")}
        >
          {t("fullResync")}
        </FormSubmitButton>
      </div>
      {run?.status === "running" && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">
              {t(`syncPhases.${run.phase}`, { name: run.currentLabel ?? "" })} · {t(`syncModes.${run.mode}`)}
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`syncProgress.${run.mode}`, {
              librariesDone: run.librariesProcessed,
              librariesTotal: run.librariesTotal,
              usersDone: run.usersProcessed,
              usersTotal: run.usersTotal,
              items: run.itemsProcessed,
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("syncRemaining", {
              libraries: Math.max(run.librariesTotal - run.librariesProcessed, 0),
              users: Math.max(run.usersTotal - run.usersProcessed, 0),
            })}
          </p>
        </div>
      )}
    </form>
  );
}
