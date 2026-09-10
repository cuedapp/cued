import "server-only";
import { and, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { acquisitionRequests, mediaItems, users } from "@/server/db/schema";

export class AcquisitionRepository {
  async createPending(userId: string, mediaType: "movie" | "series", tmdbId: number) {
    const existing = await this.findPending(mediaType, tmdbId);
    if (existing) return { request: existing, created: false as const };
    try {
      const [request] = await db.insert(acquisitionRequests).values({ userId, mediaType, tmdbId }).returning();
      return { request: request!, created: true as const };
    } catch (error) {
      const concurrent = await this.findPending(mediaType, tmdbId);
      if (concurrent) return { request: concurrent, created: false as const };
      throw error;
    }
  }

  getById(id: string) {
    return db.query.acquisitionRequests.findFirst({ where: eq(acquisitionRequests.id, id) });
  }

  findPending(mediaType: "movie" | "series", tmdbId: number) {
    return db.query.acquisitionRequests.findFirst({
      where: and(
        eq(acquisitionRequests.mediaType, mediaType),
        eq(acquisitionRequests.tmdbId, tmdbId),
        eq(acquisitionRequests.status, "pending"),
      ),
    });
  }

  async getPendingKeys(userId: string) {
    const rows = await db
      .select({ mediaType: acquisitionRequests.mediaType, tmdbId: acquisitionRequests.tmdbId })
      .from(acquisitionRequests)
      .where(and(eq(acquisitionRequests.userId, userId), eq(acquisitionRequests.status, "pending")));
    return rows.map((row) => `${row.mediaType}:${row.tmdbId}`);
  }

  async getAllPendingKeys() {
    const rows = await db
      .select({ mediaType: acquisitionRequests.mediaType, tmdbId: acquisitionRequests.tmdbId })
      .from(acquisitionRequests)
      .where(eq(acquisitionRequests.status, "pending"));
    return rows.map((row) => `${row.mediaType}:${row.tmdbId}`);
  }

  getPending() {
    return db
      .select({ request: acquisitionRequests, username: users.displayName, avatarTag: users.primaryImageTag })
      .from(acquisitionRequests)
      .innerJoin(users, eq(acquisitionRequests.userId, users.id))
      .where(eq(acquisitionRequests.status, "pending"))
      .orderBy(desc(acquisitionRequests.createdAt));
  }

  getHistory() {
    const reviewers = alias(users, "request_reviewers");
    return db
      .select({
        request: acquisitionRequests,
        username: users.displayName,
        avatarTag: users.primaryImageTag,
        reviewerName: reviewers.displayName,
        available: sql<boolean>`exists (
          select 1 from ${mediaItems}
          where ${mediaItems.kind}::text = ${acquisitionRequests.mediaType}
            and ${mediaItems.tmdbId} = ${acquisitionRequests.tmdbId}
            and ${mediaItems.removedAt} is null
        )`,
      })
      .from(acquisitionRequests)
      .innerJoin(users, eq(acquisitionRequests.userId, users.id))
      .leftJoin(reviewers, eq(acquisitionRequests.reviewedByUserId, reviewers.id))
      .where(ne(acquisitionRequests.status, "pending"))
      .orderBy(desc(acquisitionRequests.reviewedAt));
  }

  async getForUser(userId: string, page: number, pageSize: number) {
    const reviewers = alias(users, "profile_request_reviewers");
    const [{ total }] = await db
      .select({ total: count() })
      .from(acquisitionRequests)
      .where(eq(acquisitionRequests.userId, userId));
    const items = await db
      .select({ request: acquisitionRequests, reviewerName: reviewers.displayName })
      .from(acquisitionRequests)
      .leftJoin(reviewers, eq(acquisitionRequests.reviewedByUserId, reviewers.id))
      .where(eq(acquisitionRequests.userId, userId))
      .orderBy(desc(acquisitionRequests.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { total, items };
  }

  async complete(
    id: string,
    reviewedByUserId: string,
    status: "approved" | "rejected" | "failed",
    values: { providerItemId?: number; error?: string; rootFolderPath?: string; qualityProfileId?: number } = {},
  ) {
    const [request] = await db
      .update(acquisitionRequests)
      .set({
        status,
        reviewedByUserId,
        reviewedAt: new Date(),
        providerItemId: values.providerItemId,
        error: values.error,
        rootFolderPath: values.rootFolderPath,
        qualityProfileId: values.qualityProfileId,
        updatedAt: new Date(),
      })
      .where(and(eq(acquisitionRequests.id, id), eq(acquisitionRequests.status, "pending")))
      .returning();
    return request;
  }

  async removePending(id: string, userId?: string) {
    const [request] = await db
      .delete(acquisitionRequests)
      .where(
        and(
          eq(acquisitionRequests.id, id),
          eq(acquisitionRequests.status, "pending"),
          ...(userId ? [eq(acquisitionRequests.userId, userId)] : []),
        ),
      )
      .returning();
    return request;
  }

  async approveRejected(
    id: string,
    reviewedByUserId: string,
    values: { providerItemId?: number; rootFolderPath: string; qualityProfileId: number },
  ) {
    const [request] = await db
      .update(acquisitionRequests)
      .set({
        status: "approved",
        reviewedByUserId,
        reviewedAt: new Date(),
        providerItemId: values.providerItemId,
        rootFolderPath: values.rootFolderPath,
        qualityProfileId: values.qualityProfileId,
        error: null,
        updatedAt: new Date(),
      })
      .where(and(eq(acquisitionRequests.id, id), eq(acquisitionRequests.status, "rejected")))
      .returning();
    return request;
  }

  async claimAvailableRequests(integrationId: string) {
    const now = new Date();
    return db
      .update(acquisitionRequests)
      .set({ availableNotifiedAt: now, updatedAt: now })
      .from(mediaItems)
      .where(
        and(
          eq(acquisitionRequests.status, "approved"),
          isNull(acquisitionRequests.availableNotifiedAt),
          eq(mediaItems.integrationId, integrationId),
          isNull(mediaItems.removedAt),
          sql`${mediaItems.kind}::text = ${acquisitionRequests.mediaType}`,
          eq(mediaItems.tmdbId, acquisitionRequests.tmdbId),
        ),
      )
      .returning({
        userId: acquisitionRequests.userId,
        mediaType: acquisitionRequests.mediaType,
        tmdbId: acquisitionRequests.tmdbId,
        title: mediaItems.name,
      });
  }

  async setUserApprovalPolicy(userId: string, requestsRequireApproval: boolean) {
    await db.update(users).set({ requestsRequireApproval, updatedAt: new Date() }).where(eq(users.id, userId));
  }
}

export const acquisitionRepository = new AcquisitionRepository();
