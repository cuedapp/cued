import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";
import { JellyfinClient, JellyfinRequestError } from "@/server/integrations/jellyfin/client";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import type { SecretEncryption } from "@/server/security/encryption";
import { logger } from "@/lib/logger";

const staleRunThresholdMs = 30 * 60 * 1_000;

export class JellyfinSyncCancelledError extends Error {
  constructor() {
    super("Jellyfin synchronization was cancelled");
    this.name = "JellyfinSyncCancelledError";
  }
}

export function jellyfinSyncFailureLogFields(error: unknown) {
  if (error instanceof JellyfinRequestError) {
    return { errorType: "jellyfin-request", status: error.status };
  }
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    return { errorType: error.name, code: error.code };
  }
  return { errorType: error instanceof Error ? error.name : typeof error };
}

export class MediaSyncService {
  constructor(
    private readonly jellyfinRepository: JellyfinRepository,
    private readonly syncRepository: MediaSyncRepository,
    private readonly encryption: SecretEncryption,
    private readonly clientFactory: (baseUrl: string) => MediaServerProvider = (baseUrl) => new JellyfinClient(baseUrl),
    private readonly afterSuccessfulSync?: (integrationId: string) => Promise<void>,
  ) {}

  async sync(
    trigger: "manual" | "login" | "scheduled",
    requestedByUserId?: string,
    requestedMode: "full" | "updates" = "updates",
  ) {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration?.encryptedApiKey) throw new Error("Jellyfin API key is not configured");
    await this.recoverStaleRuns(integration.id);
    if ((await this.syncRepository.getLatestRun(integration.id))?.status === "running")
      throw new Error("Jellyfin synchronization is already running");
    const previousRun = await this.syncRepository.getLatestCompletedRun(integration.id);
    const needsMetadataBackfill =
      Boolean(previousRun) && (await this.syncRepository.needsGenreMetadataBackfill(integration.id));
    const mode: "full" | "updates" =
      requestedMode === "updates" && previousRun && !needsMetadataBackfill ? "updates" : "full";
    const since = mode === "updates" ? new Date(previousRun!.startedAt.getTime() - 5_000) : undefined;
    const run = await this.syncRepository.startRun(integration.id, trigger, mode, requestedByUserId);
    try {
      const apiKey = this.encryption.decrypt(integration.encryptedApiKey);
      const client = this.clientFactory(integration.baseUrl);
      await this.jellyfinRepository.syncLibraries(integration.id, await client.getLibraries(apiKey));
      const libraries = (await this.jellyfinRepository.getLibraries(integration.id)).filter(
        (library) => library.selected,
      );
      const jellyfinUsers = await client.getUsers(apiKey);
      if (mode === "full")
        await this.syncRepository.removeItemsOutsideLibraries(
          integration.id,
          libraries.map((library) => library.jellyfinLibraryId),
        );
      await this.updateRunProgress(run.id, {
        phase: "libraries",
        librariesTotal: libraries.length,
        usersTotal: jellyfinUsers.length,
      });
      let itemsProcessed = 0;
      for (const [index, library] of libraries.entries()) {
        await this.updateRunProgress(run.id, { currentLabel: library.name });
        const items = await client.getItems(apiKey, {
          parentId: library.jellyfinLibraryId,
          ...(since ? { minDateLastSaved: since } : {}),
        });
        const imported = await this.syncRepository.upsertItems(integration.id, library.jellyfinLibraryId, items);
        if (mode === "full")
          await this.syncRepository.reconcileItems(
            integration.id,
            library.jellyfinLibraryId,
            items.map((item) => item.id),
          );
        itemsProcessed += mode === "full" ? items.length : imported.changed;
        await this.updateRunProgress(run.id, {
          librariesProcessed: index + 1,
          itemsProcessed,
        });
      }
      await this.syncRepository.syncCollections(integration.id, await client.getCollections(apiKey));
      await this.updateRunProgress(run.id, { phase: "users", currentLabel: null });
      for (const [index, jellyfinUser] of jellyfinUsers.entries()) {
        await this.updateRunProgress(run.id, { currentLabel: jellyfinUser.username });
        const user = await this.syncRepository.upsertUser(integration.id, jellyfinUser);
        await this.syncRepository.syncUserLibraryAccess(user.id, integration.id, jellyfinUser);
        const accessibleLibraries = libraries.filter(
          (library) =>
            jellyfinUser.hasAccessToAllLibraries || jellyfinUser.enabledLibraryIds.includes(library.jellyfinLibraryId),
        );
        await this.syncRepository.removeUserStatesOutsideLibraries(
          user.id,
          integration.id,
          accessibleLibraries.map((library) => library.jellyfinLibraryId),
        );
        for (const library of accessibleLibraries) {
          // Jellyfin's MinDateLastSavedForUser currently filters metadata timestamps rather than
          // user-data writes, so a completed episode can be omitted unless we refresh all states.
          const items = await client.getItems(apiKey, {
            userId: jellyfinUser.id,
            parentId: library.jellyfinLibraryId,
          });
          await this.syncRepository.syncUserStates(user.id, integration.id, items);
        }
        await this.updateRunProgress(run.id, { usersProcessed: index + 1 });
      }
      await this.syncRepository.reconcileUsers(
        integration.id,
        jellyfinUsers.map((user) => user.id),
      );
      const counts = { librariesProcessed: libraries.length, itemsProcessed, usersProcessed: jellyfinUsers.length };
      if ((await this.syncRepository.completeRun(run.id, counts)) === false) throw new JellyfinSyncCancelledError();
      await this.jellyfinRepository.setHealth(integration.id, "healthy");
      if (this.afterSuccessfulSync) {
        try {
          await this.afterSuccessfulSync(integration.id);
        } catch (error) {
          logger.error("Could not send Jellyfin availability notifications", {
            integrationId: integration.id,
            errorType: error instanceof Error ? error.name : typeof error,
          });
        }
      }
      return { ...counts, mode };
    } catch (error) {
      if (error instanceof JellyfinSyncCancelledError) throw error;
      const message = error instanceof JellyfinRequestError ? error.message : "Jellyfin synchronization failed";
      logger.error("Jellyfin synchronization failed", { runId: run.id, ...jellyfinSyncFailureLogFields(error) });
      await this.syncRepository.failRun(run.id, message);
      await this.jellyfinRepository.setHealth(integration.id, "degraded", message);
      throw error;
    }
  }

  async getRecentRuns() {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration) return [];
    await this.recoverStaleRuns(integration.id);
    return this.syncRepository.getRecentRuns(integration.id);
  }

  async syncDue(now = new Date()) {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration?.encryptedApiKey) return false;
    const minutes =
      typeof integration.configuration.syncIntervalMinutes === "number"
        ? integration.configuration.syncIntervalMinutes
        : 0;
    if (minutes <= 0) return false;
    await this.recoverStaleRuns(integration.id, now);
    const latest = await this.syncRepository.getLatestRun(integration.id);
    if (latest?.status === "running") return false;
    if (latest && now.getTime() - latest.startedAt.getTime() < minutes * 60_000) return false;
    await this.sync("scheduled");
    return true;
  }

  async syncTitle(type: "movie" | "series", tmdbId: number, mappedLibraryIds: string[]) {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration?.encryptedApiKey) throw new Error("Jellyfin API key is not configured");
    const libraries = (await this.jellyfinRepository.getLibraries(integration.id)).filter((library) =>
      mappedLibraryIds.includes(library.id),
    );
    if (!libraries.length) throw new Error("No mapped Jellyfin STRM library is configured");
    const apiKey = this.encryption.decrypt(integration.encryptedApiKey);
    const client = this.clientFactory(integration.baseUrl);
    let found = false;
    for (const library of libraries) {
      const matches = await client.getItems(apiKey, {
        parentId: library.jellyfinLibraryId,
        externalId: { provider: "Tmdb", id: String(tmdbId) },
      });
      const title = matches.find((item) => item.kind === type);
      if (!title) continue;
      found = true;
      const items = type === "series" ? [title, ...(await client.getItems(apiKey, { parentId: title.id }))] : [title];
      await this.syncRepository.upsertItems(integration.id, library.jellyfinLibraryId, items);
      const jellyfinUsers = await client.getUsers(apiKey);
      for (const jellyfinUser of jellyfinUsers) {
        const user = await this.syncRepository.upsertUser(integration.id, jellyfinUser);
        await this.syncRepository.syncUserLibraryAccess(user.id, integration.id, jellyfinUser);
        if (
          !jellyfinUser.hasAccessToAllLibraries &&
          !jellyfinUser.enabledLibraryIds.includes(library.jellyfinLibraryId)
        )
          continue;
        const userMatches = await client.getItems(apiKey, {
          userId: jellyfinUser.id,
          parentId: library.jellyfinLibraryId,
          externalId: { provider: "Tmdb", id: String(tmdbId) },
        });
        const userTitle = userMatches.find((item) => item.kind === type);
        if (!userTitle) continue;
        const userItems =
          type === "series"
            ? [userTitle, ...(await client.getItems(apiKey, { userId: jellyfinUser.id, parentId: userTitle.id }))]
            : [userTitle];
        await this.syncRepository.syncUserStates(user.id, integration.id, userItems);
      }
    }
    return found;
  }

  async getLatestRun() {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration) return undefined;
    await this.recoverStaleRuns(integration.id);
    return this.syncRepository.getLatestRun(integration.id);
  }

  async abortLatestRun() {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration) return false;
    const run = await this.syncRepository.getLatestRun(integration.id);
    return run?.status === "running" ? this.syncRepository.abortRun(run.id) : false;
  }

  private async updateRunProgress(runId: string, progress: Parameters<MediaSyncRepository["updateRunProgress"]>[1]) {
    const updated = await this.syncRepository.updateRunProgress(runId, progress);
    if (updated === false) throw new JellyfinSyncCancelledError();
  }

  private async recoverStaleRuns(integrationId: string, now = new Date()) {
    const staleBefore = now.getTime() - staleRunThresholdMs;
    const running = await this.syncRepository.getRunningRuns(integrationId);
    const recovered = (
      await Promise.all(
        running
          .filter((run) => run.updatedAt.getTime() < staleBefore)
          .map((run) => this.syncRepository.failRun(run.id, "stale")),
      )
    ).filter(Boolean).length;
    if (recovered > 0) logger.warn("Recovered stale Jellyfin synchronization runs", { integrationId, recovered });
  }
}
