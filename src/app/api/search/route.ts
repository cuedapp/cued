import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, followService, tmdbMetadataService } from "@/server/application/services";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });
  const page = Math.max(1, Number(params.get("page")) || 1);
  const locale = member(params.get("locale"), ["en", "sv", "nl"], "en");
  const result = await tmdbMetadataService.search(user.id, query, locale, page);
  const requestStates = await acquisitionService
    .getStates(
      result.results
        .filter(
          (item): item is typeof item & { type: "movie" | "series" } => item.type === "movie" || item.type === "series",
        )
        .map((item) => ({ type: item.type, tmdbId: item.id })),
    )
    .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">);
  const following = Object.fromEntries(
    (await followService.list(user.id)).map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true]),
  );
  return NextResponse.json({ ...result, requestStates, following });
}

function member<const T extends readonly string[]>(value: string | null, values: T, fallback: T[number]): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
