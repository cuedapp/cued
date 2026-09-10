import "server-only";
import type { MediaSyncService } from "./media-sync.service";
import type { InAppNotificationService } from "./in-app-notification.service";
import type { M3uEditorConfiguration, M3uEditorRepository } from "@/server/db/repositories/m3u-editor.repository";
import { logger } from "@/lib/logger";

const timeoutMs = 10 * 60 * 1_000;

export class StrmImportService {
  constructor(
    private readonly repository: M3uEditorRepository,
    private readonly mediaSync: MediaSyncService | undefined,
    private readonly notifications?: InAppNotificationService,
  ) {}

  async processPending() {
    if (!this.mediaSync) return;
    const integration = await this.repository.getIntegration();
    if (!integration) return;
    const config = integration.configuration as unknown as M3uEditorConfiguration;
    for (const job of await this.repository.getPendingJellyfinImports()) {
      const parsed = /^strm-jellyfin-import:(movie|series):(\d+)$/.exec(job.jobName);
      if (!parsed) {
        await this.repository.failJellyfinImport(job.id, "Invalid STRM import job");
        continue;
      }
      const type = parsed[1] as "movie" | "series";
      const tmdbId = Number(parsed[2]);
      try {
        const found = await this.mediaSync.syncTitle(
          type,
          tmdbId,
          type === "movie" ? config.movieLibraryIds : config.seriesLibraryIds,
        );
        if (found) {
          await this.repository.completeJellyfinImport(job.id);
          if (job.requesterId) {
            const title = (await this.repository.getAvailableTitleName(type, tmdbId)) ?? `TMDB #${tmdbId}`;
            await this.notifications?.notifyUser(job.requesterId, "strm.completed", "/library", title);
          }
          logger.info("STRM title imported from Jellyfin", { type, tmdbId });
          continue;
        }
        if (Date.now() - job.startedAt.getTime() >= timeoutMs) {
          await this.repository.failJellyfinImport(job.id, "Timed out waiting for Jellyfin to discover the STRM title");
          if (job.requesterId) await this.notifications?.notifyUser(job.requesterId, "strm.failed", "/activity", `TMDB #${tmdbId}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "STRM Jellyfin import failed";
        if (Date.now() - job.startedAt.getTime() >= timeoutMs) {
          await this.repository.failJellyfinImport(job.id, message);
          if (job.requesterId) await this.notifications?.notifyUser(job.requesterId, "strm.failed", "/activity", `TMDB #${tmdbId}`);
        }
        else logger.warn("STRM title is not ready in Jellyfin", { type, tmdbId, error: message });
      }
    }
  }

  async getPendingForUser(userId: string, includeAll: boolean) {
    const jobs = await this.repository.getStrmJellyfinImports();
    return jobs.filter((job) => job.status === "pending" && (includeAll || job.requesterId === userId));
  }
}
