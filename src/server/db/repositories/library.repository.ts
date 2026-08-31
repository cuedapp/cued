import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mediaItems, mediaLibraries, userLibraryAccess } from "@/server/db/schema";

export type LibraryTypeFilter = "all" | "movie" | "series";
export type LibraryStateFilter = "all" | "active" | "removed";

export class LibraryRepository {
  async list(userId: string, filters: { type: LibraryTypeFilter; state: LibraryStateFilter }, page: number, pageSize: number) {
    const conditions: SQL[] = [
      eq(userLibraryAccess.userId, userId),
      eq(userLibraryAccess.accessible, true),
      eq(mediaLibraries.selected, true),
      inArray(mediaItems.kind, ["movie", "series"]),
    ];
    if (filters.type !== "all") conditions.push(eq(mediaItems.kind, filters.type));
    if (filters.state === "active") conditions.push(isNull(mediaItems.removedAt));
    if (filters.state === "removed") conditions.push(isNotNull(mediaItems.removedAt));
    const where = and(...conditions);
    const from = () => db.select({ item: mediaItems }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id));
    const [{ total }] = await db.select({ total: count() }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(where);
    const rows = await from().where(where).orderBy(asc(mediaItems.name), desc(mediaItems.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
    return { total, items: rows.map((row) => row.item) };
  }

  async getAccessibleJellyfinItemId(userId: string, mediaItemId: string) {
    const [row] = await db.select({ jellyfinItemId: mediaItems.jellyfinItemId }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(and(eq(mediaItems.id, mediaItemId), eq(userLibraryAccess.userId, userId), eq(userLibraryAccess.accessible, true), eq(mediaLibraries.selected, true), isNull(mediaItems.removedAt)));
    return row?.jellyfinItemId;
  }

  async getAvailableKeys(userId: string, titles: Array<{ type: "movie" | "series"; tmdbId: number }>) {
    if (titles.length === 0) return [];
    const titleConditions = titles.map((title) => and(eq(mediaItems.kind, title.type), eq(mediaItems.tmdbId, title.tmdbId)));
    const rows = await db.select({ type: mediaItems.kind, tmdbId: mediaItems.tmdbId }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(and(eq(userLibraryAccess.userId, userId), eq(userLibraryAccess.accessible, true), eq(mediaLibraries.selected, true), isNull(mediaItems.removedAt), or(...titleConditions)));
    return rows.flatMap((row) => row.tmdbId && (row.type === "movie" || row.type === "series") ? [`${row.type}:${row.tmdbId}`] : []);
  }
}

export const libraryRepository = new LibraryRepository();
