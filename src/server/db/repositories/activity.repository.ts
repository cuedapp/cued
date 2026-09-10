import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import {
  mediaItems,
  mediaLibraries,
  userLibraryAccess,
  userMediaFeedback,
  userMediaStates,
  users,
} from "@/server/db/schema";

const visibleLibrary = (userId: string) =>
  and(eq(userLibraryAccess.userId, userId), eq(userLibraryAccess.accessible, true), eq(mediaLibraries.selected, true));

const logicalTitleIdentity = sql<string>`coalesce(
  ${mediaItems.tmdbId}::text,
  nullif(${mediaItems.raw}->'ProviderIds'->>'Imdb', ''),
  concat(lower(${mediaItems.name}), ':', coalesce(to_char(${mediaItems.premiereDate}, 'YYYY-MM-DD'), 'unknown'))
)`;
const completedViewing = and(eq(userMediaStates.played, true), isNotNull(userMediaStates.lastPlayedAt));
const activityLibraryAccess = alias(userLibraryAccess, "activity_library_access");
const contributorLibraryAccess = alias(userLibraryAccess, "contributor_library_access");

export class ActivityRepository {
  async getLibrarySummary() {
    const [result] = await db
      .select({
        movies: sql<string>`count(*) filter (where ${mediaItems.kind} = 'movie')`,
        series: sql<string>`count(*) filter (where ${mediaItems.kind} = 'series')`,
      })
      .from(mediaItems)
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .where(
        and(
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
        ),
      );
    return result;
  }

  async getServerActivitySummary() {
    const [result] = await db
      .select({
        users: sql<string>`count(distinct ${users.id})`,
        lastPlayedAt: sql<Date | null>`max(case when ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then ${userMediaStates.lastPlayedAt} end)`,
        watchedTitles: sql<string>`count(distinct case when ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then concat(${userMediaStates.userId}, ':', coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId})) end)`,
        estimatedSeconds: sql<string>`coalesce(sum(case when ${mediaItems.kind} in ('movie', 'episode') and ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then coalesce(nullif(${mediaItems.runtimeTicks}, ''), '0')::numeric / 10000000 else 0 end), 0)`,
      })
      .from(users)
      .leftJoin(userMediaStates, eq(userMediaStates.userId, users.id))
      .leftJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
      .leftJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .leftJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, users.id),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(and(eq(users.disabled, false), eq(users.accessEnabled, true)));
    return result;
  }

  async getServerRatingSummary() {
    const [result] = await db
      .select({
        ratings: sql<string>`count(${userMediaFeedback.rating})`,
        averageRating: sql<string | null>`round(avg(${userMediaFeedback.rating})::numeric, 1)`,
      })
      .from(userMediaFeedback)
      .innerJoin(users, eq(users.id, userMediaFeedback.userId))
      .innerJoin(mediaItems, eq(mediaItems.id, userMediaFeedback.mediaItemId))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaFeedback.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
          isNotNull(userMediaFeedback.rating),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      );
    return result;
  }

  getServerMostWatched(limit = 5) {
    const watchers = sql<string>`count(distinct ${userMediaStates.userId})`;
    const title = sql<string>`min(${mediaItems.name})`;
    return db
      .select({ name: title, kind: mediaItems.kind, watchers })
      .from(userMediaStates)
      .innerJoin(users, eq(users.id, userMediaStates.userId))
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaStates.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(mediaLibraries.selected, true),
          completedViewing,
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .groupBy(mediaItems.kind, logicalTitleIdentity)
      .orderBy(desc(watchers), title)
      .limit(limit);
  }

  getServerRatedTitles(order: "asc" | "desc", limit = 5) {
    const direction =
      order === "desc" ? desc(sql`avg(${userMediaFeedback.rating})`) : sql`avg(${userMediaFeedback.rating})`;
    return db
      .select({
        name: mediaItems.name,
        kind: mediaItems.kind,
        averageRating: sql<string>`round(avg(${userMediaFeedback.rating})::numeric, 1)`,
        ratings: sql<string>`count(${userMediaFeedback.rating})`,
      })
      .from(userMediaFeedback)
      .innerJoin(users, eq(users.id, userMediaFeedback.userId))
      .innerJoin(mediaItems, eq(userMediaFeedback.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaFeedback.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
          isNotNull(userMediaFeedback.rating),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .groupBy(mediaItems.id, mediaItems.name, mediaItems.kind)
      .orderBy(direction, desc(sql`count(${userMediaFeedback.rating})`), mediaItems.name)
      .limit(limit);
  }

  getRecentActivity(userId: string, limit = 6) {
    const series = alias(mediaItems, "recent_activity_series");
    return db
      .select({
        name: mediaItems.name,
        kind: mediaItems.kind,
        tmdbId: sql<number | null>`coalesce(${mediaItems.tmdbId}, ${series.tmdbId})`,
        titleType: sql<"movie" | "series">`case when ${mediaItems.kind} = 'movie' then 'movie' else 'series' end`,
        seriesName: series.name,
        seasonNumber: sql<number | null>`nullif(${mediaItems.raw}->>'ParentIndexNumber', '')::integer`,
        episodeNumber: sql<number | null>`nullif(${mediaItems.raw}->>'IndexNumber', '')::integer`,
        lastPlayedAt: userMediaStates.lastPlayedAt,
        playCount: userMediaStates.playCount,
      })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaStates.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .leftJoin(
        series,
        and(eq(series.integrationId, mediaItems.integrationId), eq(series.jellyfinItemId, mediaItems.seriesJellyfinId)),
      )
      .where(
        and(
          eq(userMediaStates.userId, userId),
          completedViewing,
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "episode"]),
        ),
      )
      .orderBy(desc(userMediaStates.lastPlayedAt))
      .limit(limit);
  }

  async getEstimatedWatchSeconds(userId: string) {
    const [result] = await db
      .select({
        seconds: sql<string>`coalesce(sum(coalesce(nullif(${mediaItems.runtimeTicks}, ''), '0')::numeric / 10000000), 0)`,
      })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaStates.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(userMediaStates.userId, userId),
          completedViewing,
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "episode"]),
        ),
      );
    return Number(result?.seconds ?? 0);
  }

  getPopularTitles(userId: string, limit = 5) {
    return db
      .select({
        name: mediaItems.name,
        kind: mediaItems.kind,
        watchers: sql<string>`count(distinct ${userMediaStates.userId})`,
      })
      .from(userMediaStates)
      .innerJoin(users, eq(users.id, userMediaStates.userId))
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .innerJoin(
        contributorLibraryAccess,
        and(
          eq(contributorLibraryAccess.libraryId, mediaLibraries.id),
          eq(contributorLibraryAccess.userId, userMediaStates.userId),
          eq(contributorLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          visibleLibrary(userId),
          completedViewing,
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .groupBy(mediaItems.id, mediaItems.name, mediaItems.kind)
      .orderBy(desc(sql`count(distinct ${userMediaStates.userId})`), mediaItems.name)
      .limit(limit);
  }

  getTopRatedTitles(userId: string, limit = 5) {
    return db
      .select({
        name: mediaItems.name,
        kind: mediaItems.kind,
        averageRating: sql<string>`round(avg(${userMediaFeedback.rating})::numeric, 1)`,
        ratings: sql<string>`count(${userMediaFeedback.rating})`,
      })
      .from(userMediaFeedback)
      .innerJoin(users, eq(users.id, userMediaFeedback.userId))
      .innerJoin(mediaItems, eq(userMediaFeedback.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .innerJoin(
        contributorLibraryAccess,
        and(
          eq(contributorLibraryAccess.libraryId, mediaLibraries.id),
          eq(contributorLibraryAccess.userId, userMediaFeedback.userId),
          eq(contributorLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          visibleLibrary(userId),
          isNull(mediaItems.removedAt),
          inArray(mediaItems.kind, ["movie", "series"]),
          isNotNull(userMediaFeedback.rating),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .groupBy(mediaItems.id, mediaItems.name, mediaItems.kind)
      .orderBy(
        desc(sql`avg(${userMediaFeedback.rating})`),
        desc(sql`count(${userMediaFeedback.rating})`),
        mediaItems.name,
      )
      .limit(limit);
  }

  getRecentTrend(userId: string, since: Date) {
    return db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        titles: sql<string>`count(distinct coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId}))`,
      })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaStates.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(userMediaStates.userId, userId),
          completedViewing,
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          gte(userMediaStates.lastPlayedAt, since),
          inArray(mediaItems.kind, ["movie", "episode"]),
        ),
      )
      .groupBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`);
  }

  getServerTrend(since: Date) {
    return db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        titles: sql<string>`count(distinct concat(${userMediaStates.userId}, ':', coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId})))`,
      })
      .from(userMediaStates)
      .innerJoin(users, eq(users.id, userMediaStates.userId))
      .innerJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, userMediaStates.userId),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          completedViewing,
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          gte(userMediaStates.lastPlayedAt, since),
          inArray(mediaItems.kind, ["movie", "episode"]),
          eq(users.disabled, false),
          eq(users.accessEnabled, true),
        ),
      )
      .groupBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('day', ${userMediaStates.lastPlayedAt} at time zone 'UTC')`);
  }

  async getStatisticsInsights(userId?: string) {
    const activeUserScope = userId ? undefined : and(eq(users.disabled, false), eq(users.accessEnabled, true));
    const completedScope = and(
      completedViewing,
      eq(mediaLibraries.selected, true),
      isNull(mediaItems.removedAt),
      inArray(mediaItems.kind, ["movie", "episode"]),
      ...(userId ? [eq(userMediaStates.userId, userId)] : []),
    );
    const ratingScope = and(
      eq(mediaLibraries.selected, true),
      isNull(mediaItems.removedAt),
      inArray(mediaItems.kind, ["movie", "series"]),
      isNotNull(userMediaFeedback.rating),
      ...(userId ? [eq(userMediaFeedback.userId, userId)] : []),
    );
    const [genres, completionTypes, ratings, viewingTimes] = await Promise.all([
      db
        .select({ name: sql<string>`genre.value`, count: sql<string>`count(*)` })
        .from(userMediaStates)
        .innerJoin(users, eq(users.id, userMediaStates.userId))
        .innerJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
        .innerJoin(
          mediaLibraries,
          and(
            eq(mediaLibraries.integrationId, mediaItems.integrationId),
            eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          ),
        )
        .innerJoin(
          sql`lateral jsonb_array_elements_text(coalesce(${mediaItems.raw}->'Genres', '[]'::jsonb)) as genre(value)`,
          sql`true`,
        )
        .innerJoin(
          activityLibraryAccess,
          and(
            eq(activityLibraryAccess.libraryId, mediaLibraries.id),
            eq(activityLibraryAccess.userId, userMediaStates.userId),
            eq(activityLibraryAccess.accessible, true),
          ),
        )
        .where(and(completedScope, activeUserScope))
        .groupBy(sql`genre.value`)
        .orderBy(desc(sql`count(*)`))
        .limit(8),
      db
        .select({
          type: sql<"movie" | "series">`case when ${mediaItems.kind} = 'movie' then 'movie' else 'series' end`,
          count: sql<string>`count(distinct concat(${userMediaStates.userId}, ':', coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId})))`,
        })
        .from(userMediaStates)
        .innerJoin(users, eq(users.id, userMediaStates.userId))
        .innerJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
        .innerJoin(
          mediaLibraries,
          and(
            eq(mediaLibraries.integrationId, mediaItems.integrationId),
            eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          ),
        )
        .innerJoin(
          activityLibraryAccess,
          and(
            eq(activityLibraryAccess.libraryId, mediaLibraries.id),
            eq(activityLibraryAccess.userId, userMediaStates.userId),
            eq(activityLibraryAccess.accessible, true),
          ),
        )
        .where(and(completedScope, activeUserScope))
        .groupBy(sql`case when ${mediaItems.kind} = 'movie' then 'movie' else 'series' end`),
      db
        .select({ rating: userMediaFeedback.rating, count: sql<string>`count(*)` })
        .from(userMediaFeedback)
        .innerJoin(users, eq(users.id, userMediaFeedback.userId))
        .innerJoin(mediaItems, eq(mediaItems.id, userMediaFeedback.mediaItemId))
        .innerJoin(
          mediaLibraries,
          and(
            eq(mediaLibraries.integrationId, mediaItems.integrationId),
            eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          ),
        )
        .innerJoin(
          activityLibraryAccess,
          and(
            eq(activityLibraryAccess.libraryId, mediaLibraries.id),
            eq(activityLibraryAccess.userId, userMediaFeedback.userId),
            eq(activityLibraryAccess.accessible, true),
          ),
        )
        .where(and(ratingScope, activeUserScope))
        .groupBy(userMediaFeedback.rating)
        .orderBy(userMediaFeedback.rating),
      db
        .select({
          day: sql<number>`extract(dow from ${userMediaStates.lastPlayedAt} at time zone 'UTC')::integer`,
          hour: sql<number>`extract(hour from ${userMediaStates.lastPlayedAt} at time zone 'UTC')::integer`,
          count: sql<string>`count(*)`,
        })
        .from(userMediaStates)
        .innerJoin(users, eq(users.id, userMediaStates.userId))
        .innerJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
        .innerJoin(
          mediaLibraries,
          and(
            eq(mediaLibraries.integrationId, mediaItems.integrationId),
            eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          ),
        )
        .innerJoin(
          activityLibraryAccess,
          and(
            eq(activityLibraryAccess.libraryId, mediaLibraries.id),
            eq(activityLibraryAccess.userId, userMediaStates.userId),
            eq(activityLibraryAccess.accessible, true),
          ),
        )
        .where(and(completedScope, isNotNull(userMediaStates.lastPlayedAt), activeUserScope))
        .groupBy(
          sql`extract(dow from ${userMediaStates.lastPlayedAt} at time zone 'UTC')`,
          sql`extract(hour from ${userMediaStates.lastPlayedAt} at time zone 'UTC')`,
        ),
    ]);
    return { genres, completionTypes, ratings, viewingTimes };
  }

  getUserSummaries(userId?: string) {
    return db
      .select({
        id: users.id,
        displayName: users.displayName,
        lastPlayedAt: sql<Date | null>`max(case when ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then ${userMediaStates.lastPlayedAt} end)`,
        watchedTitles: sql<string>`count(distinct case when ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then coalesce(${mediaItems.seriesJellyfinId}, ${mediaItems.jellyfinItemId}) end)`,
        estimatedSeconds: sql<string>`coalesce(sum(case when ${mediaItems.kind} in ('movie', 'episode') and ${completedViewing} and ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null then coalesce(nullif(${mediaItems.runtimeTicks}, ''), '0')::numeric / 10000000 else 0 end), 0)`,
        ratings: sql<string>`count(${userMediaFeedback.rating}) filter (where ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null)`,
        averageRating: sql<
          string | null
        >`round((avg(${userMediaFeedback.rating}) filter (where ${mediaLibraries.selected} and ${activityLibraryAccess.id} is not null and ${mediaItems.removedAt} is null))::numeric, 1)`,
      })
      .from(users)
      .leftJoin(userMediaStates, eq(userMediaStates.userId, users.id))
      .leftJoin(mediaItems, eq(mediaItems.id, userMediaStates.mediaItemId))
      .leftJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .leftJoin(
        activityLibraryAccess,
        and(
          eq(activityLibraryAccess.libraryId, mediaLibraries.id),
          eq(activityLibraryAccess.userId, users.id),
          eq(activityLibraryAccess.accessible, true),
        ),
      )
      .leftJoin(
        userMediaFeedback,
        and(eq(userMediaFeedback.userId, users.id), eq(userMediaFeedback.mediaItemId, mediaItems.id)),
      )
      .where(userId ? eq(users.id, userId) : and(eq(users.disabled, false), eq(users.accessEnabled, true)))
      .groupBy(users.id, users.displayName, users.sortOrder)
      .orderBy(users.sortOrder, users.displayName);
  }

  async getUserSummary(userId: string) {
    const [result] = await this.getUserSummaries(userId);
    return result;
  }

  getRecentActivityForUsers(limit = 5) {
    const series = alias(mediaItems, "recent_user_activity_series");
    const ranked = db.$with("ranked_recent_activity").as(
      db
        .select({
          userId: userMediaStates.userId,
          name: sql<string>`${mediaItems.name}`.as("name"),
          kind: mediaItems.kind,
          tmdbId: sql<number | null>`coalesce(${mediaItems.tmdbId}, ${series.tmdbId})`.as("tmdb_id"),
          titleType: sql<"movie" | "series">`case when ${mediaItems.kind} = 'movie' then 'movie' else 'series' end`.as(
            "title_type",
          ),
          seriesName: sql<string | null>`${series.name}`.as("series_name"),
          seasonNumber: sql<number | null>`nullif(${mediaItems.raw}->>'ParentIndexNumber', '')::integer`.as(
            "season_number",
          ),
          episodeNumber: sql<number | null>`nullif(${mediaItems.raw}->>'IndexNumber', '')::integer`.as(
            "episode_number",
          ),
          lastPlayedAt: userMediaStates.lastPlayedAt,
          position:
            sql<number>`row_number() over (partition by ${userMediaStates.userId} order by ${userMediaStates.lastPlayedAt} desc)`.as(
              "position",
            ),
        })
        .from(userMediaStates)
        .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
        .innerJoin(
          mediaLibraries,
          and(
            eq(mediaLibraries.integrationId, mediaItems.integrationId),
            eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
          ),
        )
        .innerJoin(
          activityLibraryAccess,
          and(
            eq(activityLibraryAccess.libraryId, mediaLibraries.id),
            eq(activityLibraryAccess.userId, userMediaStates.userId),
            eq(activityLibraryAccess.accessible, true),
          ),
        )
        .leftJoin(
          series,
          and(
            eq(series.integrationId, mediaItems.integrationId),
            eq(series.jellyfinItemId, mediaItems.seriesJellyfinId),
          ),
        )
        .where(
          and(
            eq(mediaLibraries.selected, true),
            isNull(mediaItems.removedAt),
            completedViewing,
            isNotNull(userMediaStates.lastPlayedAt),
            inArray(mediaItems.kind, ["movie", "episode"]),
          ),
        ),
    );
    return db
      .with(ranked)
      .select({
        userId: ranked.userId,
        name: ranked.name,
        kind: ranked.kind,
        tmdbId: ranked.tmdbId,
        titleType: ranked.titleType,
        seriesName: ranked.seriesName,
        seasonNumber: ranked.seasonNumber,
        episodeNumber: ranked.episodeNumber,
        lastPlayedAt: ranked.lastPlayedAt,
      })
      .from(ranked)
      .where(lte(ranked.position, limit))
      .orderBy(ranked.userId, desc(ranked.lastPlayedAt));
  }
}

export const activityRepository = new ActivityRepository();
