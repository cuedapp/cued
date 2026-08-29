import "server-only";
import type { MediaSyncService } from "./media-sync.service";
import type { M3uEditorConfiguration, M3uEditorRepository } from "@/server/db/repositories/m3u-editor.repository";
import { logger } from "@/lib/logger";

const timeoutMs = 10 * 60 * 1_000;

export class StrmImportService {
  constructor(private readonly repository: M3uEditorRepository, private readonly mediaSync: MediaSyncService | undefined) {}

  async processPending() {
    if (!this.mediaSync) return;
    const integration = await this.repository.getIntegration();
    if (!integration) return;
    const config = integration.configuration as unknown as M3uEditorConfiguration;
    for (const job of await this.repository.getPendingJellyfinImports()) {
      const parsed = /^strm-jellyfin-import:(movie|series):(\d+)$/.exec(job.jobName);
      if (!parsed) { await this.repository.failJellyfinImport(job.id, "Invalid STRM import job"); continue; }
      const type = parsed[1] as "movie" | "series";
      const tmdbId = Number(parsed[2]);
      try {
        const found = await this.mediaSync.syncTitle(type, tmdbId, type === "movie" ? config.movieLibraryIds : config.seriesLibraryIds);
        if (found) { await this.repository.completeJellyfinImport(job.id); logger.info("STRM title imported from Jellyfin", { type, tmdbId }); continue; }
        if (Date.now() - job.startedAt.getTime() >= timeoutMs) await this.repository.failJellyfinImport(job.id, "Timed out waiting for Jellyfin to discover the STRM title");
      } catch (error) {
        const message = error instanceof Error ? error.message : "STRM Jellyfin import failed";
        if (Date.now() - job.startedAt.getTime() >= timeoutMs) await this.repository.failJellyfinImport(job.id, message);
        else logger.warn("STRM title is not ready in Jellyfin", { type, tmdbId, error: message });
      }
    }
  }
}
