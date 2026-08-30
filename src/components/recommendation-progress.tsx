"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

type RefreshStatus = {
  needsRefresh: boolean;
  run?: { id: string; status: string; phase: string; processedItems: number; totalItems: number; error?: string | null };
};

const recommendationToastId = "recommendations";

export function RecommendationProgress() {
  const t = useTranslations("RecommendationProgress");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<RefreshStatus>();
  const requested = useRef(false);
  const activeRun = useRef<string | undefined>(undefined);
  const reportedFailedRun = useRef<string | undefined>(undefined);

  const showProgress = useCallback((run: NonNullable<RefreshStatus["run"]>) => {
    const percentage = run.totalItems > 0 ? Math.round(run.processedItems / run.totalItems * 100) : 0;
    const progress = run.phase === "candidates" ? 90 : percentage;
    toast.loading(t("toastTitle"), {
      id: recommendationToastId,
      description: <div className="mt-1.5 w-64 space-y-2"><p>{t(`phases.${run.phase}`)}</p><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(progress, 2)}%` }} /></div><p className="text-xs text-muted-foreground">{run.totalItems > 0 ? t("progress", { done: run.processedItems, total: run.totalItems }) : t("starting")}</p></div>,
    });
  }, [t]);

  const load = useCallback(async () => {
    const response = await fetch("/api/recommendations/status", { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json() as RefreshStatus;
    setStatus(next);
    if (!next.needsRefresh) requested.current = false;
    if (next.needsRefresh && next.run?.status !== "running" && next.run?.status !== "failed" && !requested.current) {
      requested.current = true;
      await fetch("/api/recommendations/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
      window.setTimeout(() => window.dispatchEvent(new Event("cued:recommendation-refresh")), 250);
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
  }, [locale, router, showProgress, t]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), status?.run?.status === "running" ? 1_500 : 10_000);
    const refresh = () => { void load(); };
    window.addEventListener("cued:recommendation-refresh", refresh);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("cued:recommendation-refresh", refresh); };
  }, [load, status?.run?.status]);

  return null;
}

export function RecommendationRefreshButton() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  async function refresh() {
    setPending(true);
    const response = await fetch("/api/recommendations/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, force: true }) });
    if (!response.ok) {
      toast.error(t("refreshRecommendationsFailed"));
      setPending(false);
      return;
    }
    window.dispatchEvent(new Event("cued:recommendation-refresh"));
    setPending(false);
  }
  return <button type="button" onClick={refresh} disabled={pending} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />{t("refreshRecommendations")}</button>;
}
