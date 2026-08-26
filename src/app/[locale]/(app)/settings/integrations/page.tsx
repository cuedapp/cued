import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, CircleAlert, Server } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, mediaSyncService } from "@/server/application/services";
import { IntegrationForm } from "./integration-form";
import { LibrarySelectionForm } from "./library-selection-form";
import { SyncForm, type SyncRunProgress } from "./sync-form";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const integration = await jellyfinIntegrationService.getOverview();
  const syncRuns = await mediaSyncService?.getRecentRuns() ?? [];
  const latestRun = syncRuns[0];
  const initialRun: SyncRunProgress | undefined = latestRun ? {
    id: latestRun.id,
    status: latestRun.status,
    mode: latestRun.mode as "full" | "updates",
    phase: latestRun.phase,
    currentLabel: latestRun.currentLabel,
    librariesProcessed: latestRun.librariesProcessed,
    librariesTotal: latestRun.librariesTotal,
    itemsProcessed: latestRun.itemsProcessed,
    usersProcessed: latestRun.usersProcessed,
    usersTotal: latestRun.usersTotal,
    startedAt: latestRun.startedAt.toISOString(),
    updatedAt: latestRun.updatedAt.toISOString(),
    finishedAt: latestRun.finishedAt?.toISOString() ?? null,
    error: latestRun.error,
  } : undefined;
  return <div className="space-y-8">
    <header className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p></header>
    <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
      <Card><CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Server className="size-5" /></div><CardTitle>{t("jellyfin")}</CardTitle><CardDescription>{t("jellyfinHelp")}</CardDescription></CardHeader><CardContent><IntegrationForm locale={locale} baseUrl={integration.baseUrl ?? ""} encryptionConfigured={integration.encryptionConfigured} hasApiKey={integration.hasApiKey} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("status")}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex items-center gap-3">{integration.status === "healthy" ? <CheckCircle2 className="size-5 text-emerald-600" /> : <CircleAlert className="size-5 text-muted-foreground" />}<div><div className="font-medium">{integration.serverName ?? t("notConnected")}</div><div className="text-sm text-muted-foreground">{integration.serverVersion ? `Jellyfin ${integration.serverVersion}` : t("notConnectedHelp")}</div></div></div>
        <div className="rounded-xl bg-muted/60 p-4 text-sm"><span className="text-muted-foreground">{t("apiKeyStatus")}</span><span className="ml-2 font-medium">{integration.hasApiKey ? t("configured") : t("missing")}</span></div>
        {integration.lastError && <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"><div className="font-medium">{t("lastError")}</div><div className="mt-1">{integration.lastError}</div></div>}
      </CardContent></Card>
    </div>
    {integration.libraries.length > 0 && <Card><CardHeader><CardTitle>{t("libraries")}</CardTitle><CardDescription>{t("librariesHelp")}</CardDescription></CardHeader><CardContent><LibrarySelectionForm locale={locale} libraries={integration.libraries} /></CardContent></Card>}
    <Card><CardHeader><CardTitle>{t("synchronization")}</CardTitle><CardDescription>{t("synchronizationHelp")}</CardDescription></CardHeader><CardContent className="space-y-5"><SyncForm disabled={!integration.hasApiKey || integration.libraries.every((library) => !library.selected)} initialRun={initialRun} />{syncRuns.length > 0 && <div className="divide-y divide-border rounded-xl border border-border">{syncRuns.map((run) => <div key={run.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm"><div><div className="font-medium">{t(`syncStatuses.${run.status}`)} · {t(`syncModes.${run.mode}`)}</div><div className="text-muted-foreground">{run.startedAt.toLocaleString(locale)}</div>{run.error && <div className="mt-1 max-w-2xl text-destructive">{run.error}</div>}</div><div className="text-muted-foreground">{t(`syncCounts.${run.mode}`, { libraries: run.librariesProcessed, items: run.itemsProcessed, users: run.usersProcessed })}</div></div>)}</div>}</CardContent></Card>
  </div>;
}
