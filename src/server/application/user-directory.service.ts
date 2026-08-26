import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaSyncRepository } from "@/server/db/repositories/media-sync.repository";

export class UserDirectoryService {
  constructor(
    private readonly jellyfinRepository: JellyfinRepository,
    private readonly syncRepository: MediaSyncRepository,
  ) {}

  async getUsers() {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration) return [];
    const { users, libraries, access } = await this.syncRepository.getUsersWithLibraryAccess(integration.id);
    return users.map((user) => ({
      ...user,
      libraries: libraries.map((library) => ({
        id: library.id,
        name: library.name,
        selected: library.selected,
        accessible: access.some((entry) => entry.userId === user.id && entry.libraryId === library.id && entry.accessible),
      })),
    }));
  }
}
