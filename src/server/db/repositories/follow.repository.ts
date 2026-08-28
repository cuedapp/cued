import "server-only";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { followEvents, follows } from "@/server/db/schema";

export type FollowTargetType = "movie" | "series" | "person";

export class FollowRepository {
  find(userId: string, targetType: FollowTargetType, tmdbId: number) {
    return db.query.follows.findFirst({ where: and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.tmdbId, tmdbId)) });
  }

  async create(input: { userId: string; targetType: FollowTargetType; tmdbId: number; locale: string; title: string; imagePath?: string; releaseDate?: string; snapshot: { seasonCount?: number; creditKeys?: string[] }; requestState?: string }) {
    const now = new Date();
    const [follow] = await db.insert(follows).values({ ...input, lastCheckedAt: now }).onConflictDoUpdate({ target: [follows.userId, follows.targetType, follows.tmdbId], set: { locale: input.locale, title: input.title, imagePath: input.imagePath, releaseDate: input.releaseDate, snapshot: input.snapshot, requestState: input.requestState, lastCheckedAt: now, updatedAt: now } }).returning();
    return follow!;
  }

  remove(userId: string, targetType: FollowTargetType, tmdbId: number) {
    return db.delete(follows).where(and(eq(follows.userId, userId), eq(follows.targetType, targetType), eq(follows.tmdbId, tmdbId)));
  }

  list(userId: string) { return db.select().from(follows).where(eq(follows.userId, userId)).orderBy(desc(follows.createdAt)); }
  listEvents(userId: string) { return db.select().from(followEvents).where(eq(followEvents.userId, userId)).orderBy(desc(followEvents.occurredAt)); }

  getDue(cutoff: Date) {
    return db.select({ follow: follows }).from(follows).where(or(isNull(follows.lastCheckedAt), lt(follows.lastCheckedAt, cutoff)));
  }

  async update(id: string, values: { title: string; imagePath?: string; releaseDate?: string; snapshot: { seasonCount?: number; creditKeys?: string[] }; requestState?: string }) {
    await db.update(follows).set({ ...values, imagePath: values.imagePath ?? null, releaseDate: values.releaseDate ?? null, requestState: values.requestState ?? null, lastCheckedAt: new Date(), updatedAt: new Date() }).where(eq(follows.id, id));
  }

  async addEvent(input: { followId: string; userId: string; eventKey: string; eventType: string; relatedType?: string; relatedTmdbId?: number; relatedTitle?: string; detail?: Record<string, unknown> }) {
    await db.insert(followEvents).values(input).onConflictDoNothing({ target: [followEvents.userId, followEvents.eventKey] });
  }
}

export const followRepository = new FollowRepository();
