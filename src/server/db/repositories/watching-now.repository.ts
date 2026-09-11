import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { mediaItems, mediaLibraries, userLibraryAccess, users } from "@/server/db/schema";

export class WatchingNowRepository {
  async getUsers(jellyfinUserIds: string[]) {
    if (jellyfinUserIds.length === 0) return [];
    return db
      .select({
        id: users.id,
        jellyfinUserId: users.jellyfinUserId,
        displayName: users.displayName,
        primaryImageTag: users.primaryImageTag,
      })
      .from(users)
      .where(
        and(inArray(users.jellyfinUserId, jellyfinUserIds), eq(users.disabled, false), eq(users.accessEnabled, true)),
      );
  }

  async getMedia(jellyfinItemIds: string[], viewerId: string) {
    if (jellyfinItemIds.length === 0) return [];
    const series = alias(mediaItems, "watching_now_series");
    return db
      .select({
        id: mediaItems.id,
        jellyfinItemId: mediaItems.jellyfinItemId,
        name: mediaItems.name,
        kind: mediaItems.kind,
        tmdbId: mediaItems.tmdbId,
        seriesTmdbId: series.tmdbId,
        seriesName: series.name,
        contentRatingAge: mediaItems.contentRatingAge,
        seriesContentRatingAge: series.contentRatingAge,
      })
      .from(mediaItems)
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          eq(mediaLibraries.selected, true),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, viewerId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .leftJoin(
        series,
        and(eq(series.integrationId, mediaItems.integrationId), eq(series.jellyfinItemId, mediaItems.seriesJellyfinId)),
      )
      .where(and(inArray(mediaItems.jellyfinItemId, jellyfinItemIds), isNull(mediaItems.removedAt)));
  }
}

export const watchingNowRepository = new WatchingNowRepository();
