import { notFound } from "next/navigation";
import { BrainCircuit, CheckCircle2, CircleAlert, Film, ListVideo, Server, Tv } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { aiIntegrationService, jellyfinIntegrationService, m3uEditorIntegrationService, radarrIntegrationService, sonarrIntegrationService, tmdbIntegrationService } from "@/server/application/services";

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

  return <div className="space-y-8">
    <header className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p></header>
    <div className="grid gap-5 lg:grid-cols-2">
      <ProviderCard href="/settings/integrations/jellyfin" icon={<Server className="size-5" />} title={t("jellyfin")} description={t("jellyfinHelp")} status={jellyfin.status} configured={jellyfin.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/tmdb" icon={<Film className="size-5" />} title={tmdbT("title")} description={tmdbT("help")} status={tmdb.status} configured={tmdb.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/openai" icon={<BrainCircuit className="size-5" />} title={aiT("title")} description={aiT("cardHelp")} status={ai.status} configured={ai.mode !== "off"} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/radarr" icon={<Film className="size-5" />} title={t("radarr")} description={t("radarrHelp")} status={radarr.status} configured={radarr.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/sonarr" icon={<Tv className="size-5" />} title={t("sonarr")} description={t("sonarrHelp")} status={sonarr.status} configured={sonarr.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/m3u-editor" icon={<ListVideo className="size-5" />} title={t("m3uEditor")} description={t("m3uEditorHelp")} status={m3uEditor.status} configured={m3uEditor.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
    </div>
  </div>;
}

function ProviderCard({ href, icon, title, description, status, configured, manageLabel, configuredLabel, degradedLabel, unconfiguredLabel }: {
  href: "/settings/integrations/jellyfin" | "/settings/integrations/tmdb" | "/settings/integrations/openai" | "/settings/integrations/radarr" | "/settings/integrations/sonarr" | "/settings/integrations/m3u-editor";
  icon: React.ReactNode;
  title: string;
  description: string;
  status?: "unconfigured" | "healthy" | "degraded";
  configured: boolean;
  manageLabel: string;
  configuredLabel: string;
  degradedLabel: string;
  unconfiguredLabel: string;
}) {
  const healthy = status === "healthy";
  const label = healthy ? configuredLabel : status === "degraded" ? degradedLabel : unconfiguredLabel;
  return <Card className="flex flex-col">
    <CardHeader className="flex-1"><div className="mb-2 flex items-start justify-between gap-4"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div><div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${healthy ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : configured ? "bg-amber-500/12 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>{healthy ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}{label}</div></div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent><Button asChild><Link href={href}>{manageLabel}</Link></Button></CardContent>
  </Card>;
}
