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
});
