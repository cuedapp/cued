"use client";

import { useEffect, useState } from "react";
import { Check, Circle, LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type BootstrapStatus, useAppStatus } from "@/components/app-status-provider";
import { cn } from "@/lib/utils";

export function BootstrapProgress({ initialStatus }: { initialStatus: BootstrapStatus }) {
  const t = useTranslations("Bootstrap");
  const router = useRouter();
  const { status, refresh } = useAppStatus();
  const [retrying, setRetrying] = useState(false);
  const bootstrap = status?.bootstrap ?? initialStatus;

  useEffect(() => {
    if (initialStatus.status !== "completed" && bootstrap.status === "completed") router.refresh();
  }, [bootstrap.status, initialStatus.status, router]);

  async function retry() {
    setRetrying(true);
    try {
      const response = await fetch("/api/bootstrap/retry", { method: "POST" });
      if (response.ok || response.status === 409) await refresh();
    } finally {
      setRetrying(false);
    }
  }

  const activeIndex = bootstrap.phase === "syncing" || bootstrap.phase === "waiting" ? 0 : 1;
  const failed = bootstrap.status === "failed";
  const steps = ["sync", "recommendations", "ready"] as const;
  const detailHref = bootstrap.phase === "syncing" ? "/settings/integrations/jellyfin" : "/activity";

  return (
    <Card aria-live="polite" className="max-w-4xl overflow-hidden border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-10 shrink-0 place-items-center rounded-full",
              failed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            {failed ? <TriangleAlert className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}
          </span>
          <div className="min-w-0">
            <CardTitle>{t(failed ? "failedTitle" : "title")}</CardTitle>
            <CardDescription className="mt-1">{t(failed ? "failedDescription" : "description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => {
            const complete = bootstrap.status === "completed" || index < activeIndex;
            const active = !complete && index === activeIndex;
            const stepFailed = failed && active;
            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm",
                  active && !stepFailed && "border-primary/40",
                  stepFailed && "border-destructive/40",
                )}
              >
                {complete ? (
                  <Check className="size-4 shrink-0 text-emerald-600" />
                ) : stepFailed ? (
                  <TriangleAlert className="size-4 shrink-0 text-destructive" />
                ) : active ? (
                  <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={cn(active && "font-medium")}>{t(`steps.${step}`)}</span>
              </li>
            );
          })}
        </ol>
        {failed ? (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href={detailHref} className="text-sm font-medium text-primary hover:underline">
              {t("viewDetails")}
            </Link>
            <Button onClick={retry} disabled={retrying}>
              {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {retrying ? t("retrying") : t("retry")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t(`phases.${bootstrap.phase}`)}</p>
        )}
      </CardContent>
    </Card>
  );
}
