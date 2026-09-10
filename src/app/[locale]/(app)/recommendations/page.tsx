import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RecommendationBrowser } from "@/components/recommendation-browser";
import { PageIntro } from "@/components/page-intro";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  aiIntegrationService,
  followService,
  radarrIntegrationService,
  recommendationService,
  sonarrIntegrationService,
} from "@/server/application/services";
import { HiddenRecommendations } from "./hidden-recommendations";

export default async function RecommendationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("Recommendations");
  const [recommendations, hiddenRecommendations, openai, openrouter, radarr, sonarr, follows] = await Promise.all([
    recommendationService.getAll(user.id),
    recommendationService.getHidden(user.id),
    aiIntegrationService.getOverview("openai"),
    aiIntegrationService.getOverview("openrouter"),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    followService.list(user.id),
  ]);
  const aiEnabled = [openai, openrouter].some((provider) => provider.mode !== "off" && provider.hasApiKey);
  const requestStates = await acquisitionService
    .getStates(recommendations.map((item) => ({ type: item.mediaType as "movie" | "series", tmdbId: item.tmdbId })))
    .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">);
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const [radarrOptions, sonarrOptions] = allowRequestOptions
    ? await Promise.all([
        radarr.configured
          ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
        sonarr.configured
          ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
      ])
    : [
        { rootFolders: [], qualityProfiles: [], tags: [] },
        { rootFolders: [], qualityProfiles: [], tags: [] },
      ];
  return (
    <div className="space-y-6">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <RecommendationBrowser
        items={recommendations}
        aiEnabled={aiEnabled}
        requestable={{ movie: radarr.configured, series: sonarr.configured }}
        requestOptions={{
          movie: {
            rootFolders: radarrOptions.rootFolders,
            profiles: radarrOptions.qualityProfiles,
            defaultRootFolderPath: radarr.rootFolderPath,
            defaultProfileId: radarr.qualityProfileId,
          },
          series: {
            rootFolders: sonarrOptions.rootFolders,
            profiles: sonarrOptions.qualityProfiles,
            defaultRootFolderPath: sonarr.rootFolderPath,
            defaultProfileId: sonarr.qualityProfileId,
          },
        }}
        allowRequestOptions={allowRequestOptions}
        requestStates={requestStates}
        following={Object.fromEntries(follows.map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true]))}
      />
      <HiddenRecommendations items={hiddenRecommendations} />
    </div>
  );
}
