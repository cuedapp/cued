import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleAlert, Film, Tv } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { radarrIntegrationService, sonarrIntegrationService } from "@/server/application/services";
import { ArrIntegrationForm } from "./arr-integration-form";

export async function ArrIntegrationPage({ provider }: { provider: "radarr" | "sonarr" }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const arrT = await getTranslations("ArrIntegration");
  const service = provider === "radarr" ? radarrIntegrationService : sonarrIntegrationService;
  const overview = await service.getOverview();
  const options = overview.configured
    ? await service.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
    : { rootFolders: [], qualityProfiles: [], tags: [] };
  const Icon = provider === "radarr" ? Film : Tv;
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("allIntegrations")}
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{arrT(`${provider}.title`)}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{arrT(`${provider}.help`)}</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <CardTitle>{t("configuration")}</CardTitle>
            <CardDescription>{arrT("configurationHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ArrIntegrationForm provider={provider} locale={locale} overview={overview} {...options} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{arrT("status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {overview.status === "healthy" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <CircleAlert className="size-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">{overview.configured ? arrT("connected") : arrT("notConnected")}</div>
                {overview.serverName && (
                  <div className="text-sm text-muted-foreground">
                    {overview.serverName} · {overview.serverVersion}
                  </div>
                )}
              </div>
            </div>
            {overview.lastError && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{overview.lastError}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
