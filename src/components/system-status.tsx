import { Check, CircleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { appRouter } from "@/server/api/root";
import { createTrpcContext } from "@/server/api/context";

export async function SystemStatus() {
  const t = await getTranslations("Dashboard");
  let status: string | undefined;

  try {
    const caller = appRouter.createCaller(createTrpcContext());
    const info = await caller.system.info();
    status = info.status;
  } catch {
    status = undefined;
  }

  if (!status) return <div role="alert" className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" />{t("error")}</div>;
  return <div className="flex items-center gap-2 text-sm font-medium"><span className="grid size-6 place-items-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"><Check className="size-3.5" /></span>{t("apiLabel")} · {status === "ready" ? t("ready") : status}</div>;
}
