import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IntegrationStatusBadge, type IntegrationStatus } from "@/components/integration-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function ReviewStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  const integrations = await getTranslations({ locale, namespace: "Integrations" });
  const overview = await setupWizardService.getOverview();
  const ai = overview.openai.configured
    ? (["AI", overview.openai, "ai"] as const)
    : overview.openrouter.configured
      ? (["AI", overview.openrouter, "ai"] as const)
      : (["AI", overview.openai, "ai"] as const);
  const rows = [
    ["Jellyfin", overview.jellyfin, "jellyfin"],
    ["TMDB", overview.tmdb, "tmdb"],
    ["Radarr", overview.radarr, "acquisition"],
    ["Sonarr", overview.sonarr, "acquisition"],
    ["M3U Editor", overview.m3uEditor, "acquisition"],
    ai,
    ["ntfy", overview.ntfy, "notifications"],
  ] as const;
  const labels = {
    healthy: integrations("providerStatuses.healthy"),
    degraded: integrations("providerStatuses.degraded"),
    unconfigured: integrations("providerStatuses.unconfigured"),
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 font-medium">{t("review.provider")}</th>
                <th className="pb-3 font-medium">{t("review.status")}</th>
                <th className="pb-3 text-right font-medium">
                  <span className="sr-only">{t("buttons.edit")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, item, step]) => (
                <tr key={name} className="border-b border-border/70 last:border-0">
                  <td className="py-4 font-medium">{name}</td>
                  <td className="py-4">
                    <IntegrationStatusBadge
                      configured={item.configured}
                      status={item.status as IntegrationStatus}
                      labels={labels}
                    />
                  </td>
                  <td className="py-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/${locale}/setup/${step}`}>{t("buttons.edit")}</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("review.finishHelp")}</p>
      </CardContent>
    </Card>
  );
}
