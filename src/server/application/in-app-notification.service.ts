import "server-only";
import type { InAppNotificationRepository } from "@/server/db/repositories/in-app-notification.repository";
import type { NotificationRepository } from "@/server/db/repositories/notification.repository";

export class InAppNotificationService {
  constructor(
    private readonly repository: InAppNotificationRepository,
    private readonly preferences: NotificationRepository,
  ) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  listUnread(userId: string) {
    return this.repository.listUnread(userId);
  }
  unreadCount(userId: string) {
    return this.repository.unreadCount(userId);
  }
  async notifyUser(userId: string, category: string, href?: string, message?: string) {
    if (!(await this.isEnabled(userId, category))) return;
    return this.repository.create({ userId, category, href, message });
  }
  notifyAdmins(category: string, href?: string, message?: string) {
    return this.repository.createForAdmins({ category, href, message });
  }
  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }
  clear(userId: string) {
    return this.repository.clear(userId);
  }
  private async isEnabled(userId: string, category: string) {
    const preferences = await this.preferences.getInAppPreferences(userId);
    if (category.startsWith("recommendations.")) return preferences.recommendationUpdates;
    if (category.startsWith("request.")) return preferences.requestUpdates;
    if (category.startsWith("follow.")) return preferences.followingUpdates;
    return true;
  }
}
