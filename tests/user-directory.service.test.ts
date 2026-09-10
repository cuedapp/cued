import { describe, expect, it, vi } from "vitest";
import { UserDirectoryService } from "@/server/application/user-directory.service";
import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";

describe("UserDirectoryService", () => {
  it("maps each user's Jellyfin library permissions", async () => {
    const jellyfinRepository = {
      getIntegration: vi.fn().mockResolvedValue({ id: "integration" }),
    } as unknown as JellyfinRepository;
    const syncRepository = {
      getUsersWithLibraryAccess: vi.fn().mockResolvedValue({
        users: [{ id: "user-1", displayName: "Erik", primaryImageTag: "avatar-tag" }],
        libraries: [
          { id: "library-1", name: "Movies", selected: true },
          { id: "library-2", name: "Shows", selected: false },
        ],
        access: [{ userId: "user-1", libraryId: "library-1", accessible: true }],
      }),
    } as unknown as MediaSyncRepository;

    const users = await new UserDirectoryService(jellyfinRepository, syncRepository).getUsers();
    expect(users[0]?.libraries).toEqual([
      { id: "library-1", name: "Movies", selected: true, accessible: true },
      { id: "library-2", name: "Shows", selected: false, accessible: false },
    ]);
  });

  it("does not allow an administrator to deactivate themselves", async () => {
    const service = new UserDirectoryService({} as JellyfinRepository, {} as MediaSyncRepository);
    await expect(service.setAccessEnabled("user-1", "user-1", false)).rejects.toThrow(
      "Administrators cannot deactivate themselves",
    );
  });

  it("persists a complete user order", async () => {
    const jellyfinRepository = {
      getIntegration: vi.fn().mockResolvedValue({ id: "integration" }),
    } as unknown as JellyfinRepository;
    const setUserOrder = vi.fn();
    const syncRepository = {
      getUsersWithLibraryAccess: vi.fn().mockResolvedValue({
        users: [
          { id: "user-1", displayName: "One" },
          { id: "user-2", displayName: "Two" },
          { id: "user-3", displayName: "Three" },
        ],
        libraries: [],
        access: [],
      }),
      setUserOrder,
    } as unknown as MediaSyncRepository;
    const service = new UserDirectoryService(jellyfinRepository, syncRepository);
    await service.reorderUsers(["user-2", "user-1", "user-3"]);
    expect(setUserOrder).toHaveBeenCalledWith(["user-2", "user-1", "user-3"]);
  });

  it("rejects an incomplete user order", async () => {
    const jellyfinRepository = {
      getIntegration: vi.fn().mockResolvedValue({ id: "integration" }),
    } as unknown as JellyfinRepository;
    const setUserOrder = vi.fn();
    const syncRepository = {
      getUsersWithLibraryAccess: vi.fn().mockResolvedValue({
        users: [
          { id: "user-1", displayName: "One" },
          { id: "user-2", displayName: "Two" },
        ],
        libraries: [],
        access: [],
      }),
      setUserOrder,
    } as unknown as MediaSyncRepository;
    const service = new UserDirectoryService(jellyfinRepository, syncRepository);
    await expect(service.reorderUsers(["user-1"])).rejects.toThrow("every user exactly once");
    expect(setUserOrder).not.toHaveBeenCalled();
  });
});
