import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userNotifications, users } from "@/server/db/schema";

export class InAppNotificationRepository {
  list(userId: string) {
    return db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(100);
  }
  listUnread(userId: string) {
    return db
      .select()
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)))
      .orderBy(desc(userNotifications.createdAt))
      .limit(10);
  }
  async unreadCount(userId: string) {
    const [row] = await db
      .select({ value: count() })
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
    return Number(row?.value ?? 0);
  }
  async create(input: { userId: string; category: string; title?: string; message?: string; href?: string }) {
    await db.insert(userNotifications).values({
      userId: input.userId,
      category: input.category,
      title: input.title ?? input.category,
      message: input.message ?? "",
      href: input.href,
    });
  }
  async createForAdmins(input: { category: string; title?: string; message?: string; href?: string }) {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.disabled, false)));
    if (admins.length)
      await db.insert(userNotifications).values(
        admins.map((admin) => ({
          userId: admin.id,
          category: input.category,
          title: input.title ?? input.category,
          message: input.message ?? "",
          href: input.href,
        })),
      );
  }
  markAllRead(userId: string) {
    return db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
  }
  clear(userId: string) {
    return db.delete(userNotifications).where(eq(userNotifications.userId, userId));
  }
}

export const inAppNotificationRepository = new InAppNotificationRepository();
