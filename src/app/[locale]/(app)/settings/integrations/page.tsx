import { notFound } from "next/navigation";
import { BrainCircuit, CheckCircle2, CircleAlert, Film, ListVideo, Server, Tv } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import {
  aiIntegrationService,
  jellyfinIntegrationService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbIntegrationService,
} from "@/server/application/services";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const t = await getTranslations("Integrations");
  const tmdbT = await getTranslations("TmdbIntegration");
  const aiT = await getTranslations("AiProviders");
  const [jellyfin, tmdb, openai, openrouter, radarr, sonarr, m3uEditor] = await Promise.all([
    jellyfinIntegrationService.getOverview(),
    tmdbIntegrationService.getOverview(),
    aiIntegrationService.getOverview(),
    aiIntegrationService.getOverview("openrouter"),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    m3uEditorIntegrationService.getOverview(),
  ]);
  const ai = openrouter.mode !== "off" ? openrouter : openai;

  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
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
        />
        <AutomationProviders
          title={t("automationTitle")}
          description={t("automationHelp")}
          providers={[
            {
              href: "/settings/integrations/radarr",
              icon: <Film className="size-5" />,
              title: t("radarr"),
              description: t("radarrHelp"),
              status: radarr.status,
              configured: radarr.configured,
              manageLabel: t("manageRadarr"),
            },
            {
              href: "/settings/integrations/sonarr",
              icon: <Tv className="size-5" />,
              title: t("sonarr"),
              description: t("sonarrHelp"),
              status: sonarr.status,
              configured: sonarr.configured,
              manageLabel: t("manageSonarr"),
            },
          ]}
          configuredLabel={t("providerStatuses.healthy")}
          degradedLabel={t("providerStatuses.degraded")}
          unconfiguredLabel={t("providerStatuses.unconfigured")}
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
        />
      </div>
    </div>
  );
}

function AutomationProviders({
  title,
  description,
  providers,
  configuredLabel,
  degradedLabel,
  unconfiguredLabel,
}: {
  title: string;
  description: string;
  providers: Array<{
    href: "/settings/integrations/radarr" | "/settings/integrations/sonarr";
    icon: React.ReactNode;
    title: string;
    description: string;
    status?: "unconfigured" | "healthy" | "degraded";
    configured: boolean;
    manageLabel: string;
  }>;
  configuredLabel: string;
  degradedLabel: string;
  unconfiguredLabel: string;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.href}
            {...provider}
            compact
            configuredLabel={configuredLabel}
            degradedLabel={degradedLabel}
            unconfiguredLabel={unconfiguredLabel}
          />
        ))}
      </CardContent>
    </Card>
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
  compact = false,
}: {
  href:
    | "/settings/integrations/jellyfin"
    | "/settings/integrations/tmdb"
    | "/settings/integrations/openai"
    | "/settings/integrations/radarr"
    | "/settings/integrations/sonarr"
    | "/settings/integrations/m3u-editor";
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: "unconfigured" | "healthy" | "degraded";
  configured: boolean;
  manageLabel: string;
  configuredLabel: string;
  degradedLabel: string;
  unconfiguredLabel: string;
  compact?: boolean;
}) {
  const healthy = status === "healthy";
  const label = healthy ? configuredLabel : status === "degraded" ? degradedLabel : unconfiguredLabel;
  return (
    <Card className={`flex flex-col ${compact ? "bg-muted/20 shadow-none" : ""}`}>
      <CardHeader className={`flex-1 ${compact ? "p-4" : ""}`}>
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${healthy ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : configured ? "bg-amber-500/12 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}
          >
            {healthy ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {label}
          </div>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4" : undefined}>
        <Button asChild size={compact ? "sm" : "default"}>
          <Link href={href}>{manageLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
