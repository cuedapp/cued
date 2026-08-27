"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type RefreshStatus = {
  needsRefresh: boolean;
  run?: { id: string; status: string; phase: string; processedItems: number; totalItems: number; error?: string | null };
};

export function RecommendationProgress({ className }: { className?: string }) {
  const t = useTranslations("RecommendationProgress");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<RefreshStatus>();
  const requested = useRef(false);
  const previousRun = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    const response = await fetch("/api/recommendations/status", { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json() as RefreshStatus;
    setStatus(next);
    if (!next.needsRefresh) requested.current = false;
    if (next.needsRefresh && next.run?.status !== "running" && !requested.current) {
      requested.current = true;
      await fetch("/api/recommendations/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
      previousRun.current = "pending";
      window.setTimeout(() => window.dispatchEvent(new Event("cued:recommendation-refresh")), 250);
    }
    if (previousRun.current && next.run?.status === "completed" && (previousRun.current === "pending" || next.run.id === previousRun.current)) {
      previousRun.current = undefined;
      router.refresh();
      window.dispatchEvent(new Event("cued:recommendation-completed"));
    }
    if (next.run?.status === "running") previousRun.current = next.run.id;
  }, [locale, router]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), status?.run?.status === "running" ? 1_500 : 10_000);
    const refresh = () => { previousRun.current = "pending"; void load(); };
    window.addEventListener("cued:recommendation-refresh", refresh);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("cued:recommendation-refresh", refresh); };
  }, [load, status?.run?.status]);

  if (!status?.run || (status.run.status !== "running" && status.run.status !== "failed")) return null;
  const percentage = status.run.totalItems > 0 ? Math.round(status.run.processedItems / status.run.totalItems * 100) : 0;
  return <div className={cn("rounded-xl border border-border bg-background/90 p-3 backdrop-blur", className)}>
    <div className="flex items-center gap-2 text-xs font-medium">{status.run.status === "failed" ? <TriangleAlert className="size-4 text-destructive" /> : <Sparkles className="size-4 animate-pulse text-primary" />}<span>{status.run.status === "failed" ? t("failed") : t(`phases.${status.run.phase}`)}</span></div>
    {status.run.status === "running" && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${status.run.phase === "candidates" ? 90 : percentage}%` }} /></div><div className="mt-1 text-xs text-muted-foreground">{status.run.totalItems > 0 ? t("progress", { done: status.run.processedItems, total: status.run.totalItems }) : t("starting")}</div></>}
  </div>;
}

export function RecommendationRefreshButton() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  async function refresh() {
    setPending(true);
    await fetch("/api/recommendations/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, force: true }) });
    window.dispatchEvent(new Event("cued:recommendation-refresh"));
    setPending(false);
  }
  return <button type="button" onClick={refresh} disabled={pending} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />{t("refreshRecommendations")}</button>;
}
