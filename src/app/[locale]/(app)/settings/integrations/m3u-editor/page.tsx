import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, ListVideo, LoaderCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { m3uEditorIntegrationService } from "@/server/application/services";
import { M3uEditorForm } from "../m3u-editor-form";
import { M3uAvailabilitySyncForm } from "../m3u-availability-sync-form";
import { SyncScheduleForm } from "../sync-schedule-form";
import { formatRelativeDateTime } from "@/lib/date-time";

export default async function M3uEditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const { locale } = await params;
  const t = await getTranslations("Integrations");
  const m = await getTranslations("M3uEditorIntegration");
  const [overview, syncRuns] = await Promise.all([
    m3uEditorIntegrationService.getOverview(),
    m3uEditorIntegrationService.getRecentRuns(),
  ]);
  const syncStatus = {
    running: t("syncStatuses.running"),
    completed: t("syncStatuses.completed"),
    failed: t("syncStatuses.failed"),
  };
  const activeSyncRun = syncRuns.find((run) => run.status === "running");
  const completedSyncRuns = syncRuns.filter((run) => run.status !== "running");
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
        <PageIntro eyebrow={t("eyebrow")} title={m("title")} description={m("help")} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ListVideo className="size-5" />
            </div>
            <CardTitle>{t("configuration")}</CardTitle>
            <CardDescription>{m("configurationHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <M3uEditorForm locale={locale} overview={overview} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{m("status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {overview.status === "healthy" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <CircleAlert className="size-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">{overview.configured ? m("configured") : m("notConfigured")}</div>
                {overview.lastCheckedAt && (
                  <div className="text-sm text-muted-foreground">
                    {m("lastSynced", {
                      date: formatRelativeDateTime(
                        overview.lastCheckedAt,
                        new Date(),
                        locale,
                        user.dateFormat,
                        user.timeFormat,
                      ),
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/60 p-4">
                <div className="text-2xl font-semibold">{overview.counts.movie ?? 0}</div>
                <div className="text-xs text-muted-foreground">{m("movies")}</div>
              </div>
              <div className="rounded-xl bg-muted/60 p-4">
                <div className="text-2xl font-semibold">{overview.counts.series ?? 0}</div>
                <div className="text-xs text-muted-foreground">{m("series")}</div>
              </div>
            </div>
            {overview.lastError && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{overview.lastError}</div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("synchronization")}</CardTitle>
          <CardDescription>{m("syncHelp")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <SyncScheduleForm
            provider="m3u-editor"
            locale={locale}
            minutes={overview.syncIntervalMinutes}
            disabled={!overview.configured}
          />
          {activeSyncRun && (
            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <LoaderCircle className="size-4 animate-spin text-primary" />
                  {m("syncing")}
                </span>
                <span className="text-muted-foreground">{m("syncActive")}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/5 animate-pulse rounded-full bg-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{m("syncActiveHelp")}</p>
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-medium">{m("syncHistory")}</h3>
            {completedSyncRuns.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border">
                {completedSyncRuns.map((run) => (
                  <div key={run.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                    <div>
                      <div className="font-medium">{syncStatus[run.status as keyof typeof syncStatus] ?? run.status}</div>
                      <div className="text-muted-foreground">
                        {formatRelativeDateTime(run.startedAt, new Date(), locale, user.dateFormat, user.timeFormat)}
                      </div>
                      {run.error && <div className="mt-1 max-w-2xl text-destructive">{run.error}</div>}
                    </div>
                    {run.details && <div className="text-muted-foreground">{m("syncSummary", run.details)}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {m("noSyncRuns")}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <M3uAvailabilitySyncForm locale={locale} disabled={!overview.configured} />
        </CardFooter>
      </Card>
    </div>
  );
}
