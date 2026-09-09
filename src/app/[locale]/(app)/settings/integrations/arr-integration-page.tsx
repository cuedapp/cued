import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Film, Tv } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { radarrIntegrationService, sonarrIntegrationService } from "@/server/application/services";
import { ArrIntegrationForm } from "./arr-integration-form";

type Provider = "radarr" | "sonarr";
type Overview = Awaited<ReturnType<typeof radarrIntegrationService.getOverview>>;
type Options = {
  rootFolders: Array<{ id: number; path?: string; name?: string; label?: string }>;
  qualityProfiles: Array<{ id: number; name?: string; path?: string; label?: string }>;
  tags: Array<{ id: number; name?: string; path?: string; label?: string }>;
};

export async function ArrIntegrationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const arrT = await getTranslations("ArrIntegration");
  const statusLabels = t.raw("providerStatuses") as {
    healthy: string;
    degraded: string;
    unconfigured: string;
  };
  const [radarr, sonarr] = await Promise.all([getProviderData("radarr"), getProviderData("sonarr")]);
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
        <PageIntro eyebrow={t("eyebrow")} title={t("arr")} description={t("arrHelp")} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ProviderConfiguration
          provider="radarr"
          locale={locale}
          data={radarr}
          title={arrT("radarr.title")}
          help={arrT("radarr.help")}
          statusLabels={statusLabels}
        />
        <ProviderConfiguration
          provider="sonarr"
          locale={locale}
          data={sonarr}
          title={arrT("sonarr.title")}
          help={arrT("sonarr.help")}
          statusLabels={statusLabels}
        />
      </div>
    </div>
  );
}

async function getProviderData(provider: Provider): Promise<{ overview: Overview } & Options> {
  const service = provider === "radarr" ? radarrIntegrationService : sonarrIntegrationService;
  const overview = await service.getOverview();
  const options = overview.configured ? await service.getOptions().catch(emptyOptions) : emptyOptions();
  return { overview, ...options };
}

function emptyOptions(): Options {
  return { rootFolders: [], qualityProfiles: [], tags: [] };
}

function ProviderConfiguration({
  provider,
  locale,
  data,
  title,
  help,
  statusLabels,
}: {
  provider: Provider;
  locale: string;
  data: { overview: Overview } & Options;
  title: string;
  help: string;
  statusLabels: { healthy: string; degraded: string; unconfigured: string };
}) {
  const Icon = provider === "radarr" ? Film : Tv;
  const healthy = data.overview.status === "healthy";
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${healthy ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : data.overview.configured ? "bg-amber-500/12 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}
          >
            {healthy ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {healthy
              ? statusLabels.healthy
              : data.overview.configured
                ? statusLabels.degraded
                : statusLabels.unconfigured}
          </span>
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{help}</CardDescription>
      </CardHeader>
      <CardContent>
        <ArrIntegrationForm provider={provider} locale={locale} {...data} />
      </CardContent>
    </Card>
  );
}
