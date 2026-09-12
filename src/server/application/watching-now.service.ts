import { isContentRatingRestricted } from "@/lib/content-rating";
import type { JellyfinIntegrationService } from "./jellyfin-integration.service";
import type { WatchingNowRepository } from "@/server/db/repositories/watching-now.repository";

type Viewer = { id: string; role: "user" | "admin"; maximumContentRatingAge: number | null };

export type WatchingNowItem = {
  key: string;
  userId: string;
  displayName: string;
  avatarTag: string | null;
  mediaItemId: string;
  title: string;
  mediaType: "movie" | "episode";
  episodeLabel: string | null;
  href: string | null;
  progress: number | null;
  elapsedSeconds: number | null;
  runtimeSeconds: number | null;
  technical: {
    deviceName: string | null;
    clientName: string | null;
    playMethod: string | null;
    videoCodec: string | null;
    videoBitRate: number | null;
  } | null;
};

export class WatchingNowService {
  constructor(
    private readonly jellyfin: Pick<JellyfinIntegrationService, "getActiveSessions">,
    private readonly repository: WatchingNowRepository,
  ) {}

  async getForViewer(viewer: Viewer, showToUsers: boolean): Promise<WatchingNowItem[]> {
    const sessions = await this.jellyfin.getActiveSessions();
    const [users, media] = await Promise.all([
      this.repository.getUsers(sessions.map((session) => session.userId)),
      this.repository.getMedia(
        sessions.map((session) => session.itemId),
        viewer.id,
      ),
    ]);
    const usersByJellyfinId = new Map(users.map((user) => [user.jellyfinUserId, user]));
    const mediaByJellyfinId = new Map(media.map((item) => [item.jellyfinItemId, item]));
    const canSeeEveryone = viewer.role === "admin" || showToUsers;

    return sessions.flatMap((session) => {
      const user = usersByJellyfinId.get(session.userId);
      const item = mediaByJellyfinId.get(session.itemId);
      if (!user || !item || (!canSeeEveryone && user.id !== viewer.id)) return [];
      const contentRatingAge = item.seriesContentRatingAge ?? item.contentRatingAge;
      if (isContentRatingRestricted(contentRatingAge, viewer.maximumContentRatingAge)) return [];
      const isEpisode = item.kind === "episode";
      const tmdbId = isEpisode ? item.seriesTmdbId : item.tmdbId;
      const seriesName = item.seriesName ?? session.seriesName;
      const progress = progressPercentage(session.positionTicks, session.runtimeTicks);
      const elapsedSeconds = ticksToSeconds(session.positionTicks);
      const runtimeSeconds = ticksToSeconds(session.runtimeTicks);
      return [
        {
          key: `${user.id}:${session.id}`,
          userId: user.id,
          displayName: user.displayName,
          avatarTag: user.primaryImageTag,
          mediaItemId: item.id,
          title: item.name,
          mediaType: isEpisode ? "episode" : "movie",
          episodeLabel: isEpisode ? episodeLabel(seriesName, session.seasonNumber, session.episodeNumber) : null,
          href: tmdbId ? `/title/${isEpisode ? "series" : item.kind}/${tmdbId}` : null,
          progress,
          elapsedSeconds,
          runtimeSeconds,
          technical:
            viewer.role === "admin"
              ? {
                  deviceName: session.deviceName ?? null,
                  clientName: session.clientName ?? null,
                  playMethod: session.playMethod ?? null,
                  videoCodec: session.videoCodec ?? null,
                  videoBitRate: session.videoBitRate ?? null,
                }
              : null,
        },
      ];
    });
  }
}

function episodeLabel(seriesName: string | undefined | null, season: number | undefined, episode: number | undefined) {
  const number = season !== undefined && episode !== undefined ? `S${season}E${episode}` : null;
  return [seriesName, number].filter(Boolean).join(" · ");
}

function progressPercentage(positionTicks?: string, runtimeTicks?: string) {
  const position = Number(positionTicks);
  const runtime = Number(runtimeTicks);
  if (!Number.isFinite(position) || !Number.isFinite(runtime) || runtime <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((position / runtime) * 100)));
}

function ticksToSeconds(ticks?: string) {
  const value = Number(ticks);
  return Number.isFinite(value) && value >= 0 ? Math.round(value / 10_000_000) : null;
}
