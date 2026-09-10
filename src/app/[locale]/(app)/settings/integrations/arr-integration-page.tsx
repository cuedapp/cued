import { notFound } from "next/navigation";
import { ArrowLeft, Film, Tv } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IntegrationStatusBadge } from "@/components/integration-status-badge";
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
          labels={{
            server: arrT("server"),
            rootFolder: arrT("rootFolder"),
            qualityProfile: arrT("qualityProfile"),
            lastError: t("lastError"),
          }}
        />
        <ProviderConfiguration
          provider="sonarr"
          locale={locale}
          data={sonarr}
          title={arrT("sonarr.title")}
          help={arrT("sonarr.help")}
          statusLabels={statusLabels}
          labels={{
            server: arrT("server"),
            rootFolder: arrT("rootFolder"),
            qualityProfile: arrT("qualityProfile"),
            lastError: t("lastError"),
          }}
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
  labels,
}: {
  provider: Provider;
  locale: string;
  data: { overview: Overview } & Options;
  title: string;
  help: string;
  statusLabels: { healthy: string; degraded: string; unconfigured: string };
  labels: { server: string; rootFolder: string; qualityProfile: string; lastError: string };
}) {
  const Icon = provider === "radarr" ? Film : Tv;
  const qualityProfile = data.qualityProfiles.find((profile) => profile.id === data.overview.qualityProfileId)?.name;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <IntegrationStatusBadge
            status={data.overview.status}
            configured={data.overview.configured}
            labels={statusLabels}
          />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{help}</CardDescription>
        {data.overview.serverName && (
          <p className="mt-3 text-sm text-muted-foreground">
            {data.overview.serverName}
            {data.overview.serverVersion ? ` · ${data.overview.serverVersion}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {data.overview.configured && (
          <dl className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">{labels.server}</dt>
              <dd className="mt-1 truncate font-medium" title={data.overview.baseUrl}>
                {data.overview.serverName ?? data.overview.baseUrl}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{labels.rootFolder}</dt>
              <dd className="mt-1 truncate font-medium" title={data.overview.rootFolderPath}>
                {data.overview.rootFolderPath ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{labels.qualityProfile}</dt>
              <dd className="mt-1 truncate font-medium">{qualityProfile ?? "—"}</dd>
            </div>
          </dl>
        )}
        {data.overview.lastError && (
          <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            <div className="font-medium">{labels.lastError}</div>
            <div className="mt-1">{data.overview.lastError}</div>
          </div>
        )}
      </CardContent>
      <ArrIntegrationForm provider={provider} locale={locale} {...data} />
    </Card>
  );
}
