import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Server } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, mediaSyncService } from "@/server/application/services";
import { IntegrationForm } from "../integration-form";
import { LibrarySelectionForm } from "../library-selection-form";
import { SyncForm, type SyncRunProgress } from "../sync-form";
import { SyncScheduleForm } from "../sync-schedule-form";
import { formatRelativeDateTime } from "@/lib/date-time";

export default async function JellyfinIntegrationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const integration = await jellyfinIntegrationService.getOverview();
  const syncRuns = (await mediaSyncService?.getRecentRuns()) ?? [];
  const activeSyncRun = syncRuns.find((run) => run.status === "running");
  const completedSyncRuns = syncRuns.filter((run) => run.status !== "running");
  const initialRun: SyncRunProgress | undefined = activeSyncRun
    ? {
        id: activeSyncRun.id,
        status: activeSyncRun.status,
        mode: activeSyncRun.mode as "full" | "updates",
        phase: activeSyncRun.phase,
        currentLabel: activeSyncRun.currentLabel,
        librariesProcessed: activeSyncRun.librariesProcessed,
        librariesTotal: activeSyncRun.librariesTotal,
        itemsProcessed: activeSyncRun.itemsProcessed,
        usersProcessed: activeSyncRun.usersProcessed,
        usersTotal: activeSyncRun.usersTotal,
        startedAt: activeSyncRun.startedAt.toISOString(),
        updatedAt: activeSyncRun.updatedAt.toISOString(),
        finishedAt: activeSyncRun.finishedAt?.toISOString() ?? null,
        error: activeSyncRun.error,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("allIntegrations")}
        </Link>
        <PageIntro eyebrow={t("eyebrow")} title={t("jellyfin")} description={t("jellyfinHelp")} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Server className="size-5" />
            </div>
            <CardTitle>{t("configuration")}</CardTitle>
            <CardDescription>{t("jellyfinConfigurationHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <IntegrationForm
              locale={locale}
              baseUrl={integration.baseUrl ?? ""}
              externalUrl={integration.externalUrl}
              encryptionConfigured={integration.encryptionConfigured}
              hasApiKey={integration.hasApiKey}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {integration.status === "healthy" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <CircleAlert className="size-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">{integration.serverName ?? t("notConnected")}</div>
                <div className="text-sm text-muted-foreground">
                  {integration.serverVersion ? `Jellyfin ${integration.serverVersion}` : t("notConnectedHelp")}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <span className="text-muted-foreground">{t("apiKeyStatus")}</span>
              <span className="ml-2 font-medium">{integration.hasApiKey ? t("configured") : t("missing")}</span>
            </div>
            {integration.lastError && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                <div className="font-medium">{t("lastError")}</div>
                <div className="mt-1">{integration.lastError}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {integration.libraries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("libraries")}</CardTitle>
            <CardDescription>{t("librariesHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LibrarySelectionForm locale={locale} libraries={integration.libraries} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("synchronization")}</CardTitle>
          <CardDescription>{t("synchronizationHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SyncScheduleForm
            provider="jellyfin"
            locale={locale}
            minutes={integration.syncIntervalMinutes}
            disabled={!integration.hasApiKey}
          />
          <SyncForm
            locale={locale}
            disabled={!integration.hasApiKey || integration.libraries.every((library) => !library.selected)}
            initialRun={initialRun}
          >
            {completedSyncRuns.length > 0 && (
              <div className="divide-y divide-border rounded-xl border border-border">
                {completedSyncRuns.map((run) => (
                  <div key={run.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                    <div>
                      <div className="font-medium">
                        {t(`syncStatuses.${run.status}`)} · {t(`syncModes.${run.mode}`)}
                      </div>
                      <div className="text-muted-foreground">
                        {formatRelativeDateTime(run.startedAt, new Date(), locale, user.dateFormat, user.timeFormat)}
                      </div>
                      {run.error && <div className="mt-1 max-w-2xl text-destructive">{run.error}</div>}
                    </div>
                    <div className="text-muted-foreground">
                      {t(`syncCounts.${run.mode}`, {
                        libraries: run.librariesProcessed,
                        items: run.itemsProcessed,
                        users: run.usersProcessed,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SyncForm>
        </CardContent>
      </Card>
    </div>
  );
}
