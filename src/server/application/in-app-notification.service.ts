import "server-only";
import type { InAppNotificationRepository } from "@/server/db/repositories/in-app-notification.repository";

export class InAppNotificationService {
  constructor(private readonly repository: InAppNotificationRepository) {}
  list(userId: string) {
    return this.repository.list(userId);
  }
  listUnread(userId: string) {
    return this.repository.listUnread(userId);
  }
  unreadCount(userId: string) {
    return this.repository.unreadCount(userId);
  }
  notifyUser(userId: string, category: string, href?: string) {
    return this.repository.create({ userId, category, href });
  }
  notifyAdmins(category: string, href?: string) {
    return this.repository.createForAdmins({ category, href });
  }
  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }
  clear(userId: string) {
    return this.repository.clear(userId);
  }
}
