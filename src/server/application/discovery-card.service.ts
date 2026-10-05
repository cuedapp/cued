import "server-only";

import type { DiscoveryCardOptions, DiscoveryCardStates } from "@/components/discovery-card";
import {
  acquisitionService,
  followService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
} from "@/server/application/services";

type DiscoveryCardUser = { id: string; role: string; requestsRequireApproval: boolean };

export async function getDiscoveryCardOptions(user: DiscoveryCardUser | null): Promise<DiscoveryCardOptions> {
  const [radarr, sonarr, m3uEditor, accessibleStrmLibraries] = await Promise.all([
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    m3uEditorIntegrationService.getOverview(),
    user
      ? m3uEditorIntegrationService.getAccessibleMappedLibraries(user.id)
      : { movie: new Set<string>(), series: new Set<string>() },
  ]);
  const allowRequestOptions = Boolean(user && (user.role === "admin" || !user.requestsRequireApproval));
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
  return {
    strmEnabled:
      m3uEditor.configured &&
      m3uEditor.status === "healthy" &&
      (accessibleStrmLibraries.movie.size > 0 || accessibleStrmLibraries.series.size > 0),
    requestable: { movie: radarr.configured, series: sonarr.configured },
    requestOptions: {
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
    },
    allowRequestOptions,
  };
}

export async function getDiscoveryCardStates(
  userId: string,
  titles: Array<{ id: number; type: "movie" | "series" }>,
): Promise<DiscoveryCardStates> {
  const [follows, requestStates] = await Promise.all([
    followService.list(userId),
    acquisitionService
      .getStates(titles.map((item) => ({ type: item.type, tmdbId: item.id })))
      .catch(() => ({}) as DiscoveryCardStates["requestStates"]),
  ]);
  return {
    following: Object.fromEntries(follows.map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true])),
    requestStates,
  };
}
