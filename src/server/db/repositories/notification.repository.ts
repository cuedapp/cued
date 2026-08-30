import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { followEvents, follows, integrations, notificationDeliveries, notificationPreferences, recommendations, users } from "@/server/db/schema";

const leaseMs = 2 * 60_000;

export const defaultNotificationPreferences = {
  baseUrl: "https://ntfy.sh", topic: "", strongRecommendations: true, followedRequestable: true, newSeasons: true,
  persistentFailures: true, updates: true, minimumMatch: 85, failureThreshold: 3,
};

export type NotificationPreferenceInput = typeof defaultNotificationPreferences & { encryptedToken?: string | null };

export class NotificationRepository {
  async getPreferences(userId: string) {
    return (await db.query.notificationPreferences.findFirst({ where: eq(notificationPreferences.userId, userId) })) ?? { userId, ...defaultNotificationPreferences, encryptedToken: null, updatedAt: new Date(0) };
  }
  async savePreferences(userId: string, values: NotificationPreferenceInput) {
    const now = new Date();
    const [row] = await db.insert(notificationPreferences).values({ userId, ...values, updatedAt: now }).onConflictDoUpdate({ target: notificationPreferences.userId, set: { ...values, updatedAt: now } }).returning();
    return row!;
  }
  listPreferences() { return db.select({ preference: notificationPreferences, user: users }).from(notificationPreferences).innerJoin(users, eq(users.id, notificationPreferences.userId)).where(and(eq(users.disabled, false), sql`${notificationPreferences.topic} <> ''`)); }
  listStrongRecommendations(userId: string, minimumMatch: number) { return db.select().from(recommendations).where(and(eq(recommendations.userId, userId), isNull(recommendations.hiddenAt), gte(recommendations.matchPercent, minimumMatch))).orderBy(desc(recommendations.matchPercent)).limit(3); }
  listFollowEvents(userId: string) { return db.select({ event: followEvents, follow: follows }).from(followEvents).innerJoin(follows, eq(follows.id, followEvents.followId)).where(and(eq(followEvents.userId, userId), or(eq(followEvents.eventType, "new_season"), eq(followEvents.eventType, "requestable")))).orderBy(desc(followEvents.occurredAt)).limit(50); }
  listPersistentFailures(threshold: number) { return db.select().from(integrations).where(and(gte(integrations.consecutiveFailures, threshold), sql`${integrations.provider} <> 'ntfy'`)); }
  async enqueue(input: typeof notificationDeliveries.$inferInsert) { await db.insert(notificationDeliveries).values(input).onConflictDoNothing({ target: [notificationDeliveries.userId, notificationDeliveries.provider, notificationDeliveries.eventKey] }); }
  // Atomically claims deliverable rows so overlapping dispatch ticks or replicas never send the same notification twice.
  // The claimed status/nextAttemptAt also acts as a lease: a crash before sent()/failed() lets the row be reclaimed once the lease expires.
  async claimPending(limit = 25) {
    return db.transaction(async (tx) => {
      const rows = await tx.select().from(notificationDeliveries)
        .where(and(
          or(eq(notificationDeliveries.status, "pending"), eq(notificationDeliveries.status, "failed"), eq(notificationDeliveries.status, "processing")),
          lte(notificationDeliveries.nextAttemptAt, new Date()),
          sql`${notificationDeliveries.attempts} < 5`,
        ))
        .orderBy(asc(notificationDeliveries.createdAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      if (!rows.length) return [];
      const now = new Date();
      await tx.update(notificationDeliveries).set({ status: "processing", nextAttemptAt: new Date(now.getTime() + leaseMs), updatedAt: now }).where(inArray(notificationDeliveries.id, rows.map((row) => row.id)));
      return rows;
    });
  }
  async sent(id: string) { await db.update(notificationDeliveries).set({ status: "sent", sentAt: new Date(), attempts: sql`${notificationDeliveries.attempts} + 1`, lastError: null, updatedAt: new Date() }).where(eq(notificationDeliveries.id, id)); }
  async failed(id: string, attempts: number, error: string) { await db.update(notificationDeliveries).set({ status: "failed", attempts: attempts + 1, lastError: error, nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000), updatedAt: new Date() }).where(eq(notificationDeliveries.id, id)); }
}

export const notificationRepository = new NotificationRepository();
