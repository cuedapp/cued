import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RecommendationBrowser } from "@/components/recommendation-browser";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, aiIntegrationService, radarrIntegrationService, recommendationService, sonarrIntegrationService } from "@/server/application/services";

export default async function RecommendationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("Recommendations");
  const [recommendations, openai, openrouter, radarr, sonarr] = await Promise.all([recommendationService.getAll(user.id), aiIntegrationService.getOverview("openai"), aiIntegrationService.getOverview("openrouter"), radarrIntegrationService.getOverview(), sonarrIntegrationService.getOverview()]);
  const aiEnabled = [openai, openrouter].some((provider) => provider.mode !== "off" && provider.hasApiKey);
  const requestStates = await acquisitionService.getStates(recommendations.map((item) => ({ type: item.mediaType as "movie" | "series", tmdbId: item.tmdbId }))).catch(() => ({} as Record<string, "idle" | "pending" | "existing">));
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const [radarrOptions, sonarrOptions] = allowRequestOptions ? await Promise.all([
    radarr.configured ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
    sonarr.configured ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
  ]) : [{ rootFolders: [], qualityProfiles: [], tags: [] }, { rootFolders: [], qualityProfiles: [], tags: [] }];
  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p></header><RecommendationBrowser items={recommendations} aiEnabled={aiEnabled} requestable={{ movie: radarr.configured, series: sonarr.configured }} requestOptions={{ movie: { rootFolders: radarrOptions.rootFolders, profiles: radarrOptions.qualityProfiles, defaultRootFolderPath: radarr.rootFolderPath, defaultProfileId: radarr.qualityProfileId }, series: { rootFolders: sonarrOptions.rootFolders, profiles: sonarrOptions.qualityProfiles, defaultRootFolderPath: sonarr.rootFolderPath, defaultProfileId: sonarr.qualityProfileId } }} allowRequestOptions={allowRequestOptions} requestStates={requestStates} /></div>;
}
