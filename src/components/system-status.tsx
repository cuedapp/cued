"use client";

import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";

export function SystemStatus() {
  const t = useTranslations("Dashboard");
  const query = trpc.system.info.useQuery();

  if (query.isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("loading")}</div>;
  if (query.isError) return <div role="alert" className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" />{t("error")}</div>;
  return <div className="flex items-center gap-2 text-sm font-medium"><span className="grid size-6 place-items-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"><Check className="size-3.5" /></span>{t("apiLabel")} · {t("ready")}</div>;
}
