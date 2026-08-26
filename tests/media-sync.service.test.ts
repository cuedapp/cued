import { describe, expect, it, vi } from "vitest";
import { MediaSyncService } from "@/server/application/media-sync.service";
import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";
import type { MediaServerItem, MediaServerProvider } from "@/server/integrations/media-server-provider";
import { SecretEncryption } from "@/server/security/encryption";

describe("MediaSyncService", () => {
  it("syncs selected libraries and only user-accessible watch state", async () => {
    const encryption = new SecretEncryption(Buffer.alloc(32, 6).toString("base64"));
    const jellyfinRepository = {
      getIntegration: vi.fn().mockResolvedValue({ id: "integration", baseUrl: "http://jellyfin:8096", encryptedApiKey: encryption.encrypt("api-key") }),
      getLibraries: vi.fn().mockResolvedValue([
        { jellyfinLibraryId: "movies", selected: true },
        { jellyfinLibraryId: "shows", selected: true },
        { jellyfinLibraryId: "music", selected: false },
      ]),
      syncLibraries: vi.fn(),
      setHealth: vi.fn(),
    } as unknown as JellyfinRepository;
    const syncRepository = {
      startRun: vi.fn().mockResolvedValue({ id: "run" }),
      getLatestCompletedRun: vi.fn().mockResolvedValue(undefined),
      updateRunProgress: vi.fn(),
      removeItemsOutsideLibraries: vi.fn(),
      upsertItems: vi.fn().mockResolvedValue({ changed: 1 }),
      reconcileItems: vi.fn(),
      upsertUser: vi.fn().mockResolvedValue({ id: "local-user" }),
      syncUserLibraryAccess: vi.fn(),
      removeUserStatesOutsideLibraries: vi.fn(),
      syncUserStates: vi.fn(),
      reconcileUsers: vi.fn(),
      completeRun: vi.fn(),
      failRun: vi.fn(),
    } as unknown as MediaSyncRepository;
    const globalItem: MediaServerItem = { id: "movie", name: "Movie", kind: "movie", raw: {} };
    const userItem: MediaServerItem = { ...globalItem, userData: { played: true, playCount: 1 } };
    const provider = {
      getLibraries: vi.fn().mockResolvedValue([
        { id: "movies", name: "Movies", collectionType: "movies" },
        { id: "shows", name: "Shows", collectionType: "tvshows" },
      ]),
      getItems: vi.fn().mockImplementation((_key, options) => Promise.resolve(options?.userId ? [userItem] : [globalItem])),
      getUsers: vi.fn().mockResolvedValue([{ id: "jellyfin-user", username: "User", isAdministrator: false, isDisabled: false, hasAccessToAllLibraries: false, enabledLibraryIds: ["movies"] }]),
    } as unknown as MediaServerProvider;
    const result = await new MediaSyncService(jellyfinRepository, syncRepository, encryption, () => provider).sync("manual", "admin");
    expect(result).toEqual({ librariesProcessed: 2, itemsProcessed: 2, usersProcessed: 1, mode: "full" });
    expect(syncRepository.startRun).toHaveBeenCalledWith("integration", "manual", "full", "admin");
    expect(syncRepository.updateRunProgress).toHaveBeenCalledWith("run", {
      phase: "libraries",
      librariesTotal: 2,
      usersTotal: 1,
    });
    expect(syncRepository.updateRunProgress).toHaveBeenCalledWith("run", { phase: "users", currentLabel: null });
    expect(syncRepository.updateRunProgress).toHaveBeenCalledWith("run", { usersProcessed: 1 });
    expect(provider.getItems).toHaveBeenCalledWith("api-key", { userId: "jellyfin-user", parentId: "movies" });
    expect(provider.getItems).not.toHaveBeenCalledWith("api-key", { userId: "jellyfin-user", parentId: "shows" });
    expect(syncRepository.removeUserStatesOutsideLibraries).toHaveBeenCalledWith("local-user", "integration", ["movies"]);
    expect(syncRepository.reconcileItems).toHaveBeenCalledWith("integration", "movies", ["movie"]);
    expect(syncRepository.reconcileUsers).toHaveBeenCalledWith("integration", ["jellyfin-user"]);
    expect(syncRepository.completeRun).toHaveBeenCalledWith("run", { librariesProcessed: 2, itemsProcessed: 2, usersProcessed: 1 });
  });

  it("uses the last successful run as an incremental cursor without deleting unseen media", async () => {
    const encryption = new SecretEncryption(Buffer.alloc(32, 7).toString("base64"));
    const previousStartedAt = new Date("2026-08-26T12:00:00Z");
    const jellyfinRepository = {
      getIntegration: vi.fn().mockResolvedValue({ id: "integration", baseUrl: "http://jellyfin:8096", encryptedApiKey: encryption.encrypt("api-key") }),
      syncLibraries: vi.fn(),
      getLibraries: vi.fn().mockResolvedValue([{ jellyfinLibraryId: "movies", name: "Movies", selected: true }]),
      setHealth: vi.fn(),
    } as unknown as JellyfinRepository;
    const syncRepository = {
      getLatestCompletedRun: vi.fn().mockResolvedValue({ startedAt: previousStartedAt }),
      startRun: vi.fn().mockResolvedValue({ id: "run" }),
      updateRunProgress: vi.fn(),
      removeItemsOutsideLibraries: vi.fn(),
      upsertItems: vi.fn().mockResolvedValue({ changed: 0 }),
      reconcileItems: vi.fn(),
      upsertUser: vi.fn().mockResolvedValue({ id: "local-user" }),
      syncUserLibraryAccess: vi.fn(),
      removeUserStatesOutsideLibraries: vi.fn(),
      syncUserStates: vi.fn(),
      reconcileUsers: vi.fn(),
      completeRun: vi.fn(),
      failRun: vi.fn(),
    } as unknown as MediaSyncRepository;
    const provider = {
      getLibraries: vi.fn().mockResolvedValue([{ id: "movies", name: "Movies" }]),
      getUsers: vi.fn().mockResolvedValue([{ id: "jellyfin-user", username: "User", isAdministrator: false, isDisabled: false, hasAccessToAllLibraries: true, enabledLibraryIds: [] }]),
      getItems: vi.fn().mockResolvedValue([]),
    } as unknown as MediaServerProvider;

    const result = await new MediaSyncService(jellyfinRepository, syncRepository, encryption, () => provider).sync("manual", "admin", "updates");
    const cursor = new Date("2026-08-26T11:59:55Z");
    expect(result.mode).toBe("updates");
    expect(provider.getItems).toHaveBeenCalledWith("api-key", { parentId: "movies", minDateLastSaved: cursor });
    expect(provider.getItems).toHaveBeenCalledWith("api-key", { userId: "jellyfin-user", parentId: "movies", minDateLastSavedForUser: cursor });
    expect(syncRepository.removeItemsOutsideLibraries).not.toHaveBeenCalled();
    expect(syncRepository.reconcileItems).not.toHaveBeenCalled();
  });
});
