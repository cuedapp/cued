import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { mediaItems, mediaLibraries, userLibraryAccess, userMediaFeedback, userMediaStates, users } from "@/server/db/schema";

const visibleLibrary = (userId: string) => and(
  eq(userLibraryAccess.userId, userId),
  eq(userLibraryAccess.accessible, true),
  eq(mediaLibraries.selected, true),
);

export class ActivityRepository {
  getRecentActivity(userId: string, limit = 6) {
    const series = alias(mediaItems, "recent_activity_series");
    return db.select({
      name: mediaItems.name,
      kind: mediaItems.kind,
      seriesName: series.name,
      seasonNumber: sql<number | null>`nullif(${mediaItems.raw}->>'ParentIndexNumber', '')::integer`,
      episodeNumber: sql<number | null>`nullif(${mediaItems.raw}->>'IndexNumber', '')::integer`,
      lastPlayedAt: userMediaStates.lastPlayedAt,
      playCount: userMediaStates.playCount,
    })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .leftJoin(series, and(eq(series.integrationId, mediaItems.integrationId), eq(series.jellyfinItemId, mediaItems.seriesJellyfinId)))
      .where(and(eq(userMediaStates.userId, userId), eq(userMediaStates.played, true), isNotNull(userMediaStates.lastPlayedAt), inArray(mediaItems.kind, ["movie", "episode"])))
      .orderBy(desc(userMediaStates.lastPlayedAt))
      .limit(limit);
  }

  async getEstimatedWatchSeconds(userId: string) {
    const [result] = await db.select({ seconds: sql<string>`coalesce(sum(coalesce(nullif(${mediaItems.runtimeTicks}, ''), '0')::numeric / 10000000), 0)` })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(and(eq(userMediaStates.userId, userId), eq(userMediaStates.played, true), inArray(mediaItems.kind, ["movie", "episode"])));
    return Number(result?.seconds ?? 0);
  }

  getPopularTitles(userId: string, limit = 5) {
    return db.select({ name: mediaItems.name, kind: mediaItems.kind, watchers: sql<string>`count(distinct ${userMediaStates.userId})` })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(and(visibleLibrary(userId), eq(userMediaStates.played, true), isNull(mediaItems.removedAt), inArray(mediaItems.kind, ["movie", "series"])))
      .groupBy(mediaItems.id, mediaItems.name, mediaItems.kind)
      .orderBy(desc(sql`count(distinct ${userMediaStates.userId})`), mediaItems.name)
      .limit(limit);
  }

  getTopRatedTitles(userId: string, limit = 5) {
    return db.select({ name: mediaItems.name, kind: mediaItems.kind, averageRating: sql<string>`round(avg(${userMediaFeedback.rating})::numeric, 1)`, ratings: sql<string>`count(${userMediaFeedback.rating})` })
      .from(userMediaFeedback)
      .innerJoin(mediaItems, eq(userMediaFeedback.mediaItemId, mediaItems.id))
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(and(visibleLibrary(userId), isNull(mediaItems.removedAt), inArray(mediaItems.kind, ["movie", "series"]), isNotNull(userMediaFeedback.rating)))
      .groupBy(mediaItems.id, mediaItems.name, mediaItems.kind)
      .orderBy(desc(sql`avg(${userMediaFeedback.rating})`), desc(sql`count(${userMediaFeedback.rating})`), mediaItems.name)
      .limit(limit);
  }

  getRecentTrend(userId: string, since: Date) {
    return db.select({ day: sql<string>`to_char(date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC'), 'YYYY-MM-DD')`, titles: sql<string>`count(distinct coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId}))` })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(and(eq(userMediaStates.userId, userId), eq(userMediaStates.played, true), gte(userMediaStates.lastPlayedAt, since), inArray(mediaItems.kind, ["movie", "episode"])))
      .groupBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`);
  }

  getUserSummaries() {
    return db.select({
      id: users.id,
      displayName: users.displayName,
      lastPlayedAt: sql<Date | null>`max(case when ${userMediaStates.played} then ${userMediaStates.lastPlayedAt} end)`,
      watchedTitles: sql<string>`count(distinct case when ${userMediaStates.played} then coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId}) end)`,
      estimatedSeconds: sql<string>`coalesce(sum(case when ${mediaItems.kind} in ('movie', 'episode') and ${userMediaStates.played} then coalesce(nullif(${mediaItems.runtimeTicks}, ''), '0')::numeric / 10000000 else 0 end), 0)`,
      ratings: sql<string>`count(${userMediaFeedback.rating})`,
      averageRating: sql<string | null>`round(avg(${userMediaFeedback.rating})::numeric, 1)`,
    }).from(users)
      .leftJoin(userMediaStates, eq(userMediaStates.userId, users.id))
      .leftJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
      .leftJoin(userMediaFeedback, and(eq(userMediaFeedback.userId, users.id), eq(userMediaFeedback.mediaItemId, mediaItems.id)))
      .groupBy(users.id, users.displayName)
      .orderBy(users.displayName);
  }

  getRecentActivityForUsers(limit = 5) {
    const series = alias(mediaItems, "recent_user_activity_series");
    const ranked = db.$with("ranked_recent_activity").as(
      db.select({
        userId: userMediaStates.userId,
        name: mediaItems.name,
        kind: mediaItems.kind,
        seriesName: series.name,
        seasonNumber: sql<number | null>`nullif(${mediaItems.raw}->>'ParentIndexNumber', '')::integer`.as("season_number"),
        episodeNumber: sql<number | null>`nullif(${mediaItems.raw}->>'IndexNumber', '')::integer`.as("episode_number"),
        lastPlayedAt: userMediaStates.lastPlayedAt,
        position: sql<number>`row_number() over (partition by ${userMediaStates.userId} order by ${userMediaStates.lastPlayedAt} desc)`.as("position"),
      }).from(userMediaStates)
        .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
        .leftJoin(series, and(eq(series.integrationId, mediaItems.integrationId), eq(series.jellyfinItemId, mediaItems.seriesJellyfinId)))
        .where(and(eq(userMediaStates.played, true), isNotNull(userMediaStates.lastPlayedAt), inArray(mediaItems.kind, ["movie", "episode"]))),
    );
    return db.with(ranked).select({ userId: ranked.userId, name: ranked.name, kind: ranked.kind, seriesName: ranked.seriesName, seasonNumber: ranked.seasonNumber, episodeNumber: ranked.episodeNumber, lastPlayedAt: ranked.lastPlayedAt })
      .from(ranked)
      .where(lte(ranked.position, limit))
      .orderBy(ranked.userId, desc(ranked.lastPlayedAt));
  }
}

export const activityRepository = new ActivityRepository();
