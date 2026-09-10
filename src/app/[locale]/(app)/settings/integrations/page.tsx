import { notFound } from "next/navigation";
import { Bell, BrainCircuit, Clapperboard, Film, ListVideo, Server } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  IntegrationStatusBadge,
  resolvedIntegrationStatus,
  type IntegrationStatus,
} from "@/components/integration-status-badge";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { formatRelativeDateTime } from "@/lib/date-time";
import {
  aiIntegrationService,
  jellyfinIntegrationService,
  m3uEditorIntegrationService,
  notificationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbIntegrationService,
} from "@/server/application/services";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const tmdbT = await getTranslations("TmdbIntegration");
  const aiT = await getTranslations("AiProviders");
  const [jellyfin, tmdb, openai, openrouter, radarr, sonarr, m3uEditor, ntfy] = await Promise.all([
    jellyfinIntegrationService.getOverview(),
    tmdbIntegrationService.getOverview(),
    aiIntegrationService.getOverview(),
    aiIntegrationService.getOverview("openrouter"),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    m3uEditorIntegrationService.getOverview(),
    notificationService.getNtfyOverview(),
  ]);
  const ai = openrouter.mode !== "off" ? { ...openrouter, provider: "OpenRouter" } : { ...openai, provider: "OpenAI" };
  const arrConfigured = radarr.configured || sonarr.configured;
  const arrStatus =
    radarr.status === "degraded" || sonarr.status === "degraded"
      ? "degraded"
      : radarr.status === "healthy" && sonarr.status === "healthy"
        ? "healthy"
        : "unconfigured";
  const statuses = [
    resolvedIntegrationStatus(jellyfin.status, jellyfin.configured),
    resolvedIntegrationStatus(tmdb.status, tmdb.configured),
    resolvedIntegrationStatus(ai.status, ai.mode !== "off"),
    resolvedIntegrationStatus(arrStatus, arrConfigured),
    resolvedIntegrationStatus(m3uEditor.status, m3uEditor.configured),
    resolvedIntegrationStatus(ntfy.status, ntfy.configured),
  ];
  const counts = {
    healthy: statuses.filter((status) => status === "healthy").length,
    degraded: statuses.filter((status) => status === "degraded").length,
    unconfigured: statuses.filter((status) => status === "unconfigured").length,
  };
  const lastVerified = (date?: Date) =>
    date
      ? t("overviewDetails.lastVerified", {
          date: formatRelativeDateTime(date, new Date(), locale, user.dateFormat, user.timeFormat),
        })
      : undefined;

  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <dl className="grid gap-3 sm:grid-cols-3">
        {(["healthy", "degraded", "unconfigured"] as const).map((status) => (
          <div key={status} className="rounded-xl border border-border bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">{t(`providerStatuses.${status}`)}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{counts[status]}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 lg:grid-cols-2">
        <ProviderCard
          href="/settings/integrations/jellyfin"
          icon={<Server className="size-5" />}
          title={t("jellyfin")}
          description={t("jellyfinHelp")}
          status={jellyfin.status}
          configured={jellyfin.configured}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          details={[jellyfin.serverName ?? t("overviewDetails.notConnected"), lastVerified(jellyfin.lastCheckedAt)]}
        />
        <ProviderCard
          href="/settings/integrations/ntfy"
          icon={<Bell className="size-5" />}
          title={t("ntfy")}
          description={t("ntfyHelp")}
          status={ntfy.status}
          configured={ntfy.configured}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          details={[ntfy.configured ? ntfy.topic : t("overviewDetails.notConnected"), lastVerified(ntfy.lastCheckedAt)]}
        />
        <ProviderCard
          href="/settings/integrations/tmdb"
          icon={<Film className="size-5" />}
          title={tmdbT("title")}
          description={tmdbT("help")}
          status={tmdb.status}
          configured={tmdb.configured}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          details={[
            tmdb.configured ? t("overviewDetails.tokenConfigured") : t("overviewDetails.tokenMissing"),
            lastVerified(tmdb.lastCheckedAt),
          ]}
        />
        <ProviderCard
          href="/settings/integrations/openai"
          icon={<BrainCircuit className="size-5" />}
          title={aiT("title")}
          description={aiT("cardHelp")}
          status={ai.status}
          configured={ai.mode !== "off"}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          details={[ai.mode === "off" ? t("overviewDetails.notEnabled") : `${ai.provider} · ${ai.model}`, lastVerified(ai.lastCheckedAt)]}
        />
        <ProviderCard
          href="/settings/integrations/arr"
          icon={<Clapperboard className="size-5" />}
          title={t("arr")}
          description={t("arrHelp")}
          status={arrStatus}
          configured={arrConfigured}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          providerStatuses={[
            { label: t("radarr"), status: radarr.status, configured: radarr.configured, detail: lastVerified(radarr.lastCheckedAt) },
            { label: t("sonarr"), status: sonarr.status, configured: sonarr.configured, detail: lastVerified(sonarr.lastCheckedAt) },
          ]}
          showStatus={false}
        />
        <ProviderCard
          href="/settings/integrations/m3u-editor"
          icon={<ListVideo className="size-5" />}
          title={t("m3uEditor")}
          description={t("m3uEditorHelp")}
          status={m3uEditor.status}
          configured={m3uEditor.configured}
          manageLabel={t("manage")}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
          details={[
            m3uEditor.configured
              ? t("overviewDetails.catalog", { movie: m3uEditor.counts.movie ?? 0, series: m3uEditor.counts.series ?? 0 })
              : t("overviewDetails.notConnected"),
            lastVerified(m3uEditor.lastCheckedAt ?? undefined),
          ]}
        />
      </div>
    </div>
  );
}

function ProviderCard({
  href,
  icon,
  title,
  description,
  status,
  configured,
  manageLabel,
  configuredLabel,
  degradedLabel,
  unconfiguredLabel,
  details,
  providerStatuses,
  showStatus = true,
  compact = false,
}: {
  href:
    | "/settings/integrations/jellyfin"
    | "/settings/integrations/tmdb"
    | "/settings/integrations/openai"
    | "/settings/integrations/arr"
    | "/settings/integrations/radarr"
    | "/settings/integrations/sonarr"
    | "/settings/integrations/m3u-editor"
    | "/settings/integrations/ntfy";
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: "unconfigured" | "healthy" | "degraded";
  configured: boolean;
  manageLabel: string;
  configuredLabel: string;
  degradedLabel: string;
  unconfiguredLabel: string;
  details?: Array<string | undefined>;
  providerStatuses?: Array<{ label: string; status: IntegrationStatus; configured: boolean; detail?: string }>;
  showStatus?: boolean;
  compact?: boolean;
}) {
  const labels = { healthy: configuredLabel, degraded: degradedLabel, unconfigured: unconfiguredLabel };
  return (
    <Card className={`flex flex-col ${compact ? "bg-muted/20 shadow-none" : ""}`}>
      <CardHeader className={`flex-1 ${compact ? "p-4" : ""}`}>
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
          {showStatus && <IntegrationStatusBadge status={status} configured={configured} labels={labels} />}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {(details?.some(Boolean) || providerStatuses) && (
          <div className="mt-4 space-y-2 text-sm">
            {details?.filter(Boolean).map((detail) => <p key={detail} className="text-muted-foreground">{detail}</p>)}
            {providerStatuses?.map((provider) => (
              <div key={provider.label} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <span>
                  <span className="block font-medium">{provider.label}</span>
                  {provider.detail && <span className="block text-xs text-muted-foreground">{provider.detail}</span>}
                </span>
                <IntegrationStatusBadge status={provider.status} configured={provider.configured} labels={labels} />
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      <CardFooter className={compact ? "justify-end px-4 py-3" : "justify-end"}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={href}>{manageLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
