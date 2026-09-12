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
      libraries: libraries
        .map((library) => ({
          id: library.id,
          name: library.name,
          selected: library.selected,
          accessible: access.some(
            (entry) => entry.userId === user.id && entry.libraryId === library.id && entry.accessible,
          ),
        }))
        .sort((left, right) => {
          const rank = (library: { selected: boolean; accessible: boolean }) =>
            library.selected && library.accessible ? 0 : library.selected ? 1 : 2;
          return rank(left) - rank(right) || left.name.localeCompare(right.name);
        }),
    }));
  }

  async getUser(userId: string) {
    return (await this.getUsers()).find((user) => user.id === userId);
  }

  async setAccessEnabled(actorUserId: string, userId: string, accessEnabled: boolean) {
    if (actorUserId === userId && !accessEnabled) throw new Error("Administrators cannot deactivate themselves");
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await this.syncRepository.setUserAccessEnabled(userId, accessEnabled);
  }

  async setContentRatingLimit(userId: string, maximumContentRatingAge: number | null) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await this.syncRepository.setUserContentRatingLimit(userId, maximumContentRatingAge);
  }

  async setAiChatPolicy(userId: string, enabled: boolean, dailyLimit: number) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    await this.syncRepository.setUserAiChatPolicy(userId, enabled, dailyLimit);
  }

  async reorderUsers(userIds: string[]) {
    const users = await this.getUsers();
    const existingIds = users.map((user) => user.id);
    if (
      userIds.length !== existingIds.length ||
      new Set(userIds).size !== userIds.length ||
      userIds.some((id) => !existingIds.includes(id))
    ) {
      throw new Error("User order must contain every user exactly once");
    }
    await this.syncRepository.setUserOrder(userIds);
  }
}
