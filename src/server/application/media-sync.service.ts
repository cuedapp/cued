import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";
import { JellyfinClient, JellyfinRequestError } from "@/server/integrations/jellyfin/client";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import type { SecretEncryption } from "@/server/security/encryption";

export class MediaSyncService {
  constructor(
    private readonly jellyfinRepository: JellyfinRepository,
    private readonly syncRepository: MediaSyncRepository,
    private readonly encryption: SecretEncryption,
    private readonly clientFactory: (baseUrl: string) => MediaServerProvider = (baseUrl) => new JellyfinClient(baseUrl),
  ) {}

  async sync(trigger: "manual" | "login" | "scheduled", requestedByUserId?: string, requestedMode: "full" | "updates" = "updates") {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration?.encryptedApiKey) throw new Error("Jellyfin API key is not configured");
    const previousRun = await this.syncRepository.getLatestCompletedRun(integration.id);
    const mode: "full" | "updates" = requestedMode === "updates" && previousRun ? "updates" : "full";
    const since = mode === "updates" ? new Date(previousRun!.startedAt.getTime() - 5_000) : undefined;
    const run = await this.syncRepository.startRun(integration.id, trigger, mode, requestedByUserId);
    try {
      const apiKey = this.encryption.decrypt(integration.encryptedApiKey);
      const client = this.clientFactory(integration.baseUrl);
      await this.jellyfinRepository.syncLibraries(integration.id, await client.getLibraries(apiKey));
      const libraries = (await this.jellyfinRepository.getLibraries(integration.id)).filter((library) => library.selected);
      const jellyfinUsers = await client.getUsers(apiKey);
      if (mode === "full") await this.syncRepository.removeItemsOutsideLibraries(integration.id, libraries.map((library) => library.jellyfinLibraryId));
      await this.syncRepository.updateRunProgress(run.id, {
        phase: "libraries",
        librariesTotal: libraries.length,
        usersTotal: jellyfinUsers.length,
      });
      let itemsProcessed = 0;
      for (const [index, library] of libraries.entries()) {
        await this.syncRepository.updateRunProgress(run.id, { currentLabel: library.name });
        const items = await client.getItems(apiKey, { parentId: library.jellyfinLibraryId, ...(since ? { minDateLastSaved: since } : {}) });
        const imported = await this.syncRepository.upsertItems(integration.id, library.jellyfinLibraryId, items);
        if (mode === "full") await this.syncRepository.reconcileItems(integration.id, library.jellyfinLibraryId, items.map((item) => item.id));
        itemsProcessed += mode === "full" ? items.length : imported.changed;
        await this.syncRepository.updateRunProgress(run.id, {
          librariesProcessed: index + 1,
          itemsProcessed,
        });
      }
      await this.syncRepository.updateRunProgress(run.id, { phase: "users", currentLabel: null });
      for (const [index, jellyfinUser] of jellyfinUsers.entries()) {
        await this.syncRepository.updateRunProgress(run.id, { currentLabel: jellyfinUser.username });
        const user = await this.syncRepository.upsertUser(integration.id, jellyfinUser);
        await this.syncRepository.syncUserLibraryAccess(user.id, integration.id, jellyfinUser);
        const accessibleLibraries = libraries.filter((library) => jellyfinUser.hasAccessToAllLibraries || jellyfinUser.enabledLibraryIds.includes(library.jellyfinLibraryId));
        await this.syncRepository.removeUserStatesOutsideLibraries(user.id, integration.id, accessibleLibraries.map((library) => library.jellyfinLibraryId));
        for (const library of accessibleLibraries) {
          const items = await client.getItems(apiKey, { userId: jellyfinUser.id, parentId: library.jellyfinLibraryId, ...(since ? { minDateLastSavedForUser: since } : {}) });
          await this.syncRepository.syncUserStates(user.id, integration.id, items);
        }
        await this.syncRepository.updateRunProgress(run.id, { usersProcessed: index + 1 });
      }
      await this.syncRepository.reconcileUsers(integration.id, jellyfinUsers.map((user) => user.id));
      const counts = { librariesProcessed: libraries.length, itemsProcessed, usersProcessed: jellyfinUsers.length };
      await this.syncRepository.completeRun(run.id, counts);
      await this.jellyfinRepository.setHealth(integration.id, "healthy");
      return { ...counts, mode };
    } catch (error) {
      const message = error instanceof JellyfinRequestError ? error.message : "Jellyfin synchronization failed";
      await this.syncRepository.failRun(run.id, message);
      await this.jellyfinRepository.setHealth(integration.id, "degraded", message);
      throw error;
    }
  }

  async getRecentRuns() {
    const integration = await this.jellyfinRepository.getIntegration();
    return integration ? this.syncRepository.getRecentRuns(integration.id) : [];
  }

  async syncTitle(type: "movie" | "series", tmdbId: number, mappedLibraryIds: string[]) {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration?.encryptedApiKey) throw new Error("Jellyfin API key is not configured");
    const libraries = (await this.jellyfinRepository.getLibraries(integration.id)).filter((library) => mappedLibraryIds.includes(library.id));
    if (!libraries.length) throw new Error("No mapped Jellyfin STRM library is configured");
    const apiKey = this.encryption.decrypt(integration.encryptedApiKey);
    const client = this.clientFactory(integration.baseUrl);
    let found = false;
    for (const library of libraries) {
      const matches = await client.getItems(apiKey, { parentId: library.jellyfinLibraryId, externalId: { provider: "Tmdb", id: String(tmdbId) } });
      const title = matches.find((item) => item.kind === type);
      if (!title) continue;
      found = true;
      const items = type === "series" ? [title, ...await client.getItems(apiKey, { parentId: title.id })] : [title];
      await this.syncRepository.upsertItems(integration.id, library.jellyfinLibraryId, items);
      const jellyfinUsers = await client.getUsers(apiKey);
      for (const jellyfinUser of jellyfinUsers) {
        const user = await this.syncRepository.upsertUser(integration.id, jellyfinUser);
        await this.syncRepository.syncUserLibraryAccess(user.id, integration.id, jellyfinUser);
        if (!jellyfinUser.hasAccessToAllLibraries && !jellyfinUser.enabledLibraryIds.includes(library.jellyfinLibraryId)) continue;
        const userMatches = await client.getItems(apiKey, { userId: jellyfinUser.id, parentId: library.jellyfinLibraryId, externalId: { provider: "Tmdb", id: String(tmdbId) } });
        const userTitle = userMatches.find((item) => item.kind === type);
        if (!userTitle) continue;
        const userItems = type === "series" ? [userTitle, ...await client.getItems(apiKey, { userId: jellyfinUser.id, parentId: userTitle.id })] : [userTitle];
        await this.syncRepository.syncUserStates(user.id, integration.id, userItems);
      }
    }
    return found;
  }


  async getLatestRun() {
    const integration = await this.jellyfinRepository.getIntegration();
    return integration ? this.syncRepository.getLatestRun(integration.id) : undefined;
  }
}
