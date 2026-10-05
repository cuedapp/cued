import { NextResponse } from "next/server";
import { getDiscoveryCardStates } from "@/server/application/discovery-card.service";
import { tmdbMetadataService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { isOriginalLanguageCode } from "@/lib/original-languages";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const locale = params.get("locale") ?? user.locale;
  const scope = params.get("scope") === "upcoming" ? "upcoming" : "trending";
  const type = params.get("type");
  const mediaType = type === "movie" || type === "series" ? type : "all";
  const page = Math.min(500, Math.max(1, Number(params.get("page")) || 1));
  const genreId = Number(params.get("genre"));
  const minimumRating = Number(params.get("minimumRating"));
  const sortParam = params.get("sort");
  const sort = ["feed", "popularity", "rating", "releaseAsc", "releaseDesc"].includes(sortParam ?? "")
    ? (sortParam as "feed" | "popularity" | "rating" | "releaseAsc" | "releaseDesc")
    : "feed";
  const originalLanguages = (params.get("languages") ?? "").split(",").filter(isOriginalLanguageCode).slice(0, 8);
  const result = await tmdbMetadataService.getExploreForUser(user.id, locale, scope, mediaType, page, {
    ...(Number.isSafeInteger(genreId) && genreId > 0 ? { genreId } : {}),
    ...(minimumRating > 0 && minimumRating <= 10 ? { minimumRating } : {}),
    sort,
    ...(originalLanguages.length ? { originalLanguages } : {}),
  });
  const cardStates = await getDiscoveryCardStates(user.id, result.results);
  return NextResponse.json({
    ...result,
    ...cardStates,
  });
}
