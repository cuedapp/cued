import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  integrations,
  jobRuns,
  notificationDeliveries,
  notificationPreferences,
  users,
} from "@/server/db/schema";

const leaseMs = 2 * 60_000;

export const defaultInAppNotificationPreferences = {
  recommendationUpdates: true,
  requestUpdates: true,
  requestAvailabilityUpdates: true,
  followingUpdates: true,
};

export type InAppNotificationPreferenceInput = typeof defaultInAppNotificationPreferences;

export class NotificationRepository {
  getNtfyIntegration() {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, "ntfy") });
  }
  async saveNtfyIntegration(input: { baseUrl: string; encryptedToken?: string | null; topic: string; integrationFailures: boolean; jobFailures: boolean; failureThreshold: number; updates: boolean }) {
    const now = new Date();
    const [row] = await db
      .insert(integrations)
      .values({
        provider: "ntfy",
        baseUrl: input.baseUrl,
        encryptedApiKey: input.encryptedToken,
        serverName: "ntfy",
        status: "healthy",
        lastCheckedAt: now,
        configuration: { topic: input.topic, integrationFailures: input.integrationFailures, jobFailures: input.jobFailures, failureThreshold: input.failureThreshold, updates: input.updates },
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: integrations.provider,
        set: {
          baseUrl: input.baseUrl,
          ...(input.encryptedToken !== undefined ? { encryptedApiKey: input.encryptedToken } : {}),
          serverName: "ntfy",
          status: "healthy",
          lastCheckedAt: now,
          lastError: null,
          configuration: { topic: input.topic, integrationFailures: input.integrationFailures, jobFailures: input.jobFailures, failureThreshold: input.failureThreshold, updates: input.updates },
          updatedAt: now,
        },
      })
      .returning();
    return row!;
  }
  async listAdminIds() {
    return db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.disabled, false)));
  }
  listRecentJobFailures() {
    return db.select().from(jobRuns).where(eq(jobRuns.status, "failed")).orderBy(desc(jobRuns.finishedAt)).limit(20);
  }
  async getInAppPreferences(userId: string) {
    return (
      (await db.query.notificationPreferences.findFirst({ where: eq(notificationPreferences.userId, userId) })) ?? {
        userId,
        ...defaultInAppNotificationPreferences,
        updatedAt: new Date(0),
      }
    );
  }
  async saveInAppPreferences(userId: string, values: InAppNotificationPreferenceInput) {
    const now = new Date();
    const [row] = await db
      .insert(notificationPreferences)
      .values({ userId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...values, updatedAt: now },
      })
      .returning();
    return row!;
  }
  listPersistentFailures(threshold: number) {
    return db
      .select()
      .from(integrations)
      .where(and(gte(integrations.consecutiveFailures, threshold), sql`${integrations.provider} <> 'ntfy'`));
  }
  async enqueue(input: typeof notificationDeliveries.$inferInsert) {
    await db
      .insert(notificationDeliveries)
      .values(input)
      .onConflictDoNothing({
        target: [notificationDeliveries.userId, notificationDeliveries.provider, notificationDeliveries.eventKey],
      });
  }
  // Atomically claims deliverable rows so overlapping dispatch ticks or replicas never send the same notification twice.
  // The claimed status/nextAttemptAt also acts as a lease: a crash before sent()/failed() lets the row be reclaimed once the lease expires.
  async claimPending(limit = 25, provider?: string) {
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(notificationDeliveries)
        .where(
          and(
            or(
              eq(notificationDeliveries.status, "pending"),
              eq(notificationDeliveries.status, "failed"),
              eq(notificationDeliveries.status, "processing"),
            ),
            lte(notificationDeliveries.nextAttemptAt, new Date()),
            sql`${notificationDeliveries.attempts} < 5`,
            ...(provider ? [eq(notificationDeliveries.provider, provider)] : []),
          ),
        )
        .orderBy(asc(notificationDeliveries.createdAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      if (!rows.length) return [];
      const now = new Date();
      await tx
        .update(notificationDeliveries)
        .set({ status: "processing", nextAttemptAt: new Date(now.getTime() + leaseMs), updatedAt: now })
        .where(
          inArray(
            notificationDeliveries.id,
            rows.map((row) => row.id),
          ),
        );
      return rows;
    });
  }
  async sent(id: string) {
    await db
      .update(notificationDeliveries)
      .set({
        status: "sent",
        sentAt: new Date(),
        attempts: sql`${notificationDeliveries.attempts} + 1`,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id));
  }
  async failed(id: string, attempts: number, error: string) {
    await db
      .update(notificationDeliveries)
      .set({
        status: "failed",
        attempts: attempts + 1,
        lastError: error,
        nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id));
  }
}

export const notificationRepository = new NotificationRepository();
