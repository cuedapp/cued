import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { tmdbMetadataService } from "@/server/application/services";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; season: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rawId, season: rawSeason } = await params;
  const id = Number(rawId);
  const seasonNumber = Number(rawSeason);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(seasonNumber) || seasonNumber < 0)
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  if (!isLocale(locale)) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  try {
    return NextResponse.json(await tmdbMetadataService.getSeasonForUser(user.id, id, seasonNumber, locale));
  } catch {
    return NextResponse.json({ error: "Season unavailable" }, { status: 502 });
  }
}
