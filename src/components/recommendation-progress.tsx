"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useAppStatus, type RecommendationStatus } from "./app-status-provider";

const recommendationToastId = "recommendations";

export function RecommendationProgress() {
  const t = useTranslations("RecommendationProgress");
  const locale = useLocale();
  const router = useRouter();
  const { status, refresh } = useAppStatus();
  const recommendationStatus = status?.recommendations;
  const bootstrapActive = Boolean(status?.bootstrap && status.bootstrap.status !== "completed");
  const requested = useRef(false);
  const activeRun = useRef<string | undefined>(undefined);
  const reportedFailedRun = useRef<string | undefined>(undefined);

  const showProgress = useCallback(
    (run: NonNullable<RecommendationStatus["run"]>) => {
      const percentage = run.totalItems > 0 ? Math.round((run.processedItems / run.totalItems) * 100) : 0;
      const progress = run.phase === "candidates" ? 90 : percentage;
      toast.info(t("toastTitle"), {
        id: recommendationToastId,
        dismissible: true,
        closeButton: true,
        description: (
          <div className="mt-1.5 w-64 space-y-2">
            <p>{t(`phases.${run.phase}`)}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {run.totalItems > 0 ? t("progress", { done: run.processedItems, total: run.totalItems }) : t("starting")}
            </p>
          </div>
        ),
      });
    },
    [t],
  );

  useEffect(() => {
    const next = recommendationStatus;
    if (bootstrapActive) return;
    if (!next) return;
    if (!next.needsRefresh) requested.current = false;
    if (next.needsRefresh && next.run?.status !== "running" && next.run?.status !== "failed" && !requested.current) {
      requested.current = true;
      void fetch("/api/recommendations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
        .then((response) => {
          if (!response.ok) requested.current = false;
          window.setTimeout(() => void refresh(), 250);
        })
        .catch(() => {
          requested.current = false;
        });
    }
    if (next.run?.status === "running") {
      activeRun.current = next.run.id;
      showProgress(next.run);
    }
    if (activeRun.current && next.run?.status === "completed" && next.run.id === activeRun.current) {
      activeRun.current = undefined;
      router.refresh();
      toast.success(t("completed"), { id: recommendationToastId, description: t("completedDescription") });
      window.dispatchEvent(new Event("cued:recommendation-completed"));
    }
    if (next.run?.status === "failed" && reportedFailedRun.current !== next.run.id) {
      reportedFailedRun.current = next.run.id;
      activeRun.current = undefined;
      requested.current = false;
      toast.error(t("failed"), { id: recommendationToastId, description: next.run.error ?? t("failedDescription") });
      window.dispatchEvent(new Event("cued:recommendation-failed"));
    }
  }, [bootstrapActive, locale, recommendationStatus, refresh, router, showProgress, t]);

  return null;
}

export function RecommendationRefreshButton() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const { refresh: refreshStatus } = useAppStatus();
  async function refresh() {
    setPending(true);
    const response = await fetch("/api/recommendations/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, force: true }),
    });
    if (!response.ok) {
      toast.error(t("refreshRecommendationsFailed"));
      setPending(false);
      return;
    }
    await refreshStatus();
    setPending(false);
  }
  return (
    <Button
      type="button"
      onClick={refresh}
      disabled={pending}
      variant="outline"
      size="sm"
      className="cursor-pointer disabled:cursor-wait"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {t("refreshRecommendations")}
    </Button>
  );
}
