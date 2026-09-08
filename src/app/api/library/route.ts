import { NextRequest, NextResponse } from "next/server";
import { viewingIntentPresets, type ViewingIntentPreset } from "@/lib/viewing-intent";
import { getCurrentUser } from "@/server/auth/session";
import { followService, libraryService, recommendationService } from "@/server/application/services";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const genres = await libraryService.listGenres(user.id);
  const type = member(params.get("type"), ["all", "movie", "series"], "all");
  const state = member(params.get("state"), ["all", "active", "removed"], "active");
  const ratingSource = member(
    params.get("ratingSource"),
    ["jellyfin", "tmdb", "imdb", "rottenTomatoes", "metacritic", "trakt"],
    "jellyfin",
  );
  const sort = member(params.get("sort"), ["title", "year-desc", "year-asc", "rating", "added"], "title");
  const page = Math.max(1, Number(params.get("page")) || 1);
  const result = await libraryService.list(
    user.id,
    {
      type,
      state,
      query: (params.get("query") ?? "").trim().slice(0, 100),
      genres: (params.get("genre") ?? "").split(",").filter((genre) => genres.includes(genre)),
      minimumRating: [5, 6, 7, 8, 9].includes(Number(params.get("rating"))) ? Number(params.get("rating")) : null,
      ratingSource,
      sort,
      intentPresets: (params.get("intent") ?? "")
        .split(",")
        .filter((value): value is ViewingIntentPreset => viewingIntentPresets.includes(value as ViewingIntentPreset)),
      intentText: (params.get("intentText") ?? "").trim().slice(0, 120),
    },
    page,
    60,
  );
  const titles = result.items.flatMap((item) => (item.tmdbId ? [{ type: item.mediaType, tmdbId: item.tmdbId }] : []));
  const [feedback, follows] = await Promise.all([
    recommendationService.getFeedbackByTitles(user.id, titles),
    followService.list(user.id),
  ]);
  return NextResponse.json({
    items: result.items,
    page: result.page,
    hasMore: result.page < result.totalPages,
    feedback: Object.fromEntries(feedback),
    following: Object.fromEntries(
      follows
        .filter((follow) => follow.targetType === "movie" || follow.targetType === "series")
        .map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true]),
    ),
  });
}

function member<const T extends readonly string[]>(value: string | null, values: T, fallback: T[number]): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
