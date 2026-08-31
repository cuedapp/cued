import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mediaItems, mediaLibraries, mediaRatings, userLibraryAccess } from "@/server/db/schema";
import { viewingIntentPresetTerms, type ViewingIntentPreset } from "@/lib/viewing-intent";

export type LibraryTypeFilter = "all" | "movie" | "series";
export type LibraryStateFilter = "all" | "active" | "removed";
export type LibrarySort = "title" | "year-desc" | "year-asc" | "rating" | "added";
export type LibraryRatingSource = "jellyfin" | "tmdb" | "imdb" | "rottenTomatoes" | "metacritic" | "trakt";
export type LibraryFilters = {
  type: LibraryTypeFilter;
  state: LibraryStateFilter;
  query: string;
  genre: string;
  minimumRating: number | null;
  ratingSource: LibraryRatingSource;
  sort: LibrarySort;
  intentPresets: readonly ViewingIntentPreset[];
  intentText: string;
};

export class LibraryRepository {
  async list(userId: string, filters: LibraryFilters, page: number, pageSize: number) {
    const conditions: SQL[] = [
      eq(userLibraryAccess.userId, userId),
      eq(userLibraryAccess.accessible, true),
      eq(mediaLibraries.selected, true),
      inArray(mediaItems.kind, ["movie", "series"]),
    ];
    if (filters.type !== "all") conditions.push(eq(mediaItems.kind, filters.type));
    if (filters.state === "active") conditions.push(isNull(mediaItems.removedAt));
    if (filters.state === "removed") conditions.push(isNotNull(mediaItems.removedAt));
    if (filters.query) conditions.push(ilike(mediaItems.name, `%${filters.query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
    if (filters.genre) conditions.push(sql`${mediaItems.raw}->'Genres' @> ${JSON.stringify([filters.genre])}::jsonb`);
    if (filters.minimumRating !== null) conditions.push(gte(ratingScore(filters.ratingSource), filters.minimumRating));
    const movieOnly = filters.intentPresets.includes("movieTonight") && !filters.intentPresets.includes("startSeries");
    const seriesOnly = filters.intentPresets.includes("startSeries") && !filters.intentPresets.includes("movieTonight");
    if (movieOnly) conditions.push(eq(mediaItems.kind, "movie"));
    if (seriesOnly) conditions.push(eq(mediaItems.kind, "series"));
    const searchable = sql<string>`concat_ws(' ', ${mediaItems.name}, coalesce(${mediaItems.raw}->>'Overview', ''), coalesce(${mediaItems.raw}->'Genres', '[]'::jsonb)::text)`;
    const moodTerms = [...new Set(filters.intentPresets.flatMap((preset) => preset in viewingIntentPresetTerms ? viewingIntentPresetTerms[preset as keyof typeof viewingIntentPresetTerms] : []))];
    if (moodTerms.length > 0) conditions.push(or(...moodTerms.map((term) => ilike(searchable, `%${escapeLike(term)}%`)))!);
    const textTerms = tokenizeIntent(filters.intentText);
    if (textTerms.length > 0) conditions.push(or(...textTerms.map((term) => ilike(searchable, `%${escapeLike(term)}%`)))!);
    const where = and(...conditions);
    const from = () => db.select({ item: mediaItems, ratingValue: mediaRatings.value, ratingScale: mediaRatings.scale, ratingScore: mediaRatings.normalizedScore, ratingVotes: mediaRatings.votes }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .leftJoin(mediaRatings, and(eq(mediaRatings.mediaType, mediaItems.kind), eq(mediaRatings.tmdbId, mediaItems.tmdbId), eq(mediaRatings.source, filters.ratingSource)));
    const [{ total }] = await db.select({ total: count() }).from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .leftJoin(mediaRatings, and(eq(mediaRatings.mediaType, mediaItems.kind), eq(mediaRatings.tmdbId, mediaItems.tmdbId), eq(mediaRatings.source, filters.ratingSource)))
      .where(where);
    const rows = await from().where(where).orderBy(...orderFor(filters.sort, filters.ratingSource, filters.intentPresets.includes("surpriseMe"))).limit(pageSize).offset((page - 1) * pageSize);
    return { total, items: rows.map((row) => ({
      ...row.item,
      selectedRating: filters.ratingSource === "jellyfin"
        ? jellyfinRating(row.item.raw.CommunityRating)
        : row.ratingValue !== null && row.ratingScale !== null && row.ratingScore !== null
          ? { source: filters.ratingSource, value: row.ratingValue, scale: row.ratingScale, normalizedScore: row.ratingScore, votes: row.ratingVotes }
          : null,
    })) };
  }

  async listGenres(userId: string) {
    const rows = await db.selectDistinct({ genre: sql<string>`jsonb_array_elements_text(${mediaItems.raw}->'Genres')` })
      .from(mediaItems)
      .innerJoin(mediaLibraries, and(eq(mediaLibraries.integrationId, mediaItems.integrationId), eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId)))
      .innerJoin(userLibraryAccess, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(and(eq(userLibraryAccess.userId, userId), eq(userLibraryAccess.accessible, true), eq(mediaLibraries.selected, true), inArray(mediaItems.kind, ["movie", "series"])))
      .orderBy(sql`1`);
    return rows.map((row) => row.genre);
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

function orderFor(sort: LibrarySort, source: LibraryRatingSource, surprise: boolean): SQL[] {
  if (surprise) return [sql`md5(${mediaItems.id}::text)`];
  if (sort === "year-desc") return [sql`${mediaItems.premiereDate} desc nulls last`, asc(mediaItems.name)];
  if (sort === "year-asc") return [sql`${mediaItems.premiereDate} asc nulls last`, asc(mediaItems.name)];
  if (sort === "rating") return [sql`${ratingScore(source)} desc nulls last`, asc(mediaItems.name)];
  if (sort === "added") return [desc(mediaItems.createdAt), asc(mediaItems.name)];
  return [asc(mediaItems.name), desc(mediaItems.createdAt)];
}

function tokenizeIntent(value: string) { return value.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((term) => term.length >= 3).slice(0, 8); }
function escapeLike(value: string) { return value.replaceAll("%", "\\%").replaceAll("_", "\\_"); }

function ratingScore(source: LibraryRatingSource) {
  return source === "jellyfin"
    ? sql<number>`nullif(${mediaItems.raw}->>'CommunityRating', '')::numeric`
    : sql<number>`${mediaRatings.normalizedScore}`;
}

function jellyfinRating(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? { source: "jellyfin" as const, value, scale: 10, normalizedScore: value, votes: null }
    : null;
}

export const libraryRepository = new LibraryRepository();
