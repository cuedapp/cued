import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, Film, Server } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, tmdbIntegrationService } from "@/server/application/services";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const t = await getTranslations("Integrations");
  const tmdbT = await getTranslations("TmdbIntegration");
  const [jellyfin, tmdb] = await Promise.all([
    jellyfinIntegrationService.getOverview(),
    tmdbIntegrationService.getOverview(),
  ]);

  return <div className="space-y-8">
    <header className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p></header>
    <div className="grid gap-5 lg:grid-cols-2">
      <ProviderCard href="/settings/integrations/jellyfin" icon={<Server className="size-5" />} title={t("jellyfin")} description={t("jellyfinHelp")} status={jellyfin.status} configured={jellyfin.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
      <ProviderCard href="/settings/integrations/tmdb" icon={<Film className="size-5" />} title={tmdbT("title")} description={tmdbT("help")} status={tmdb.status} configured={tmdb.configured} manageLabel={t("manage")} configuredLabel={t("providerStatuses.healthy")} degradedLabel={t("providerStatuses.degraded")} unconfiguredLabel={t("providerStatuses.unconfigured")} />
    </div>
  </div>;
}

function ProviderCard({ href, icon, title, description, status, configured, manageLabel, configuredLabel, degradedLabel, unconfiguredLabel }: {
  href: "/settings/integrations/jellyfin" | "/settings/integrations/tmdb";
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
