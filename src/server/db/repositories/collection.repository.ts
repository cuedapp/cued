import "server-only";
import { and, asc, countDistinct, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  mediaCollectionItems,
  mediaCollections,
  mediaItems,
  mediaLibraries,
  userLibraryAccess,
  userMediaStates,
  users,
} from "@/server/db/schema";

export class CollectionRepository {
  async listForUser(userId: string) {
    return db
      .select({
        id: sql<string>`(array_agg(${mediaCollections.id} order by ${mediaCollections.updatedAt} desc))[1]`,
        name: sql<string>`(array_agg(${mediaCollections.name} order by ${mediaCollections.updatedAt} desc))[1]`,
        tmdbId: sql<number | null>`max(${mediaCollections.tmdbId})`,
        source: sql<string>`(array_agg(${mediaCollections.source} order by ${mediaCollections.updatedAt} desc))[1]`,
        itemCount: countDistinct(mediaCollectionItems.mediaItemId),
        posterMediaItemId: sql<string>`(array_agg(${mediaItems.id} order by ${mediaCollectionItems.position}))[1]`,
      })
      .from(mediaCollections)
      .innerJoin(mediaCollectionItems, eq(mediaCollectionItems.collectionId, mediaCollections.id))
      .innerJoin(mediaItems, eq(mediaItems.id, mediaCollectionItems.mediaItemId))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, userId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .innerJoin(users, eq(users.id, userId))
      .where(
        and(
          isNull(mediaCollections.removedAt),
          isNull(mediaItems.removedAt),
          eq(mediaLibraries.selected, true),
          or(
            isNull(users.maximumContentRatingAge),
            isNull(mediaItems.contentRatingAge),
            lte(mediaItems.contentRatingAge, users.maximumContentRatingAge),
          ),
        ),
      )
      .groupBy(
        sql`case when ${mediaCollections.tmdbId} is not null then 'tmdb:' || ${mediaCollections.tmdbId}::text else 'jellyfin:' || ${mediaCollections.id}::text end`,
      )
      .orderBy(asc(sql`(array_agg(${mediaCollections.name} order by ${mediaCollections.updatedAt} desc))[1]`));
  }

  async getForUser(userId: string, collectionId: string) {
    const rows = await db
      .select({
        id: mediaCollections.id,
        name: mediaCollections.name,
        tmdbId: mediaCollections.tmdbId,
        source: mediaCollections.source,
        mediaItemId: mediaItems.id,
        tmdbMediaId: mediaItems.tmdbId,
        mediaType: mediaItems.kind,
        title: mediaItems.name,
        premiereDate: mediaItems.premiereDate,
        contentRatingAge: mediaItems.contentRatingAge,
        played: userMediaStates.played,
        playedPercentage: userMediaStates.playedPercentage,
        position: mediaCollectionItems.position,
      })
      .from(mediaCollections)
      .innerJoin(mediaCollectionItems, eq(mediaCollectionItems.collectionId, mediaCollections.id))
      .innerJoin(mediaItems, eq(mediaItems.id, mediaCollectionItems.mediaItemId))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, userId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .innerJoin(users, eq(users.id, userId))
      .where(
        and(
          eq(mediaCollections.id, collectionId),
          isNull(mediaCollections.removedAt),
          isNull(mediaItems.removedAt),
          eq(mediaLibraries.selected, true),
          or(
            isNull(users.maximumContentRatingAge),
            isNull(mediaItems.contentRatingAge),
            lte(mediaItems.contentRatingAge, users.maximumContentRatingAge),
          ),
        ),
      )
      .orderBy(asc(mediaCollectionItems.position), asc(mediaItems.premiereDate));
    if (rows.length === 0) return undefined;
    const first = rows[0]!;
    return {
      id: first.id,
      name: first.name,
      tmdbId: first.tmdbId,
      source: first.source,
      items: rows.flatMap((row) =>
        row.mediaType === "movie" || row.mediaType === "series"
          ? [
              {
                id: row.mediaItemId,
                tmdbId: row.tmdbMediaId,
                type: row.mediaType,
                title: row.title,
                year: row.premiereDate?.getFullYear(),
                contentRatingAge: row.contentRatingAge,
                watched: Boolean(row.played || (row.playedPercentage ?? 0) >= 100),
                partiallyWatched: !row.played && (row.playedPercentage ?? 0) > 0 && (row.playedPercentage ?? 0) < 100,
              },
            ]
          : [],
      ),
    };
  }

  async getByTmdbIdForUser(userId: string, tmdbId: number) {
    const collections = await this.listForUser(userId);
    return collections.find((collection) => collection.tmdbId === tmdbId);
  }
}

export const collectionRepository = new CollectionRepository();
