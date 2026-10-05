import { NextResponse } from "next/server";
import { parseSeasonalSelection } from "@/lib/seasonal-browsing";
import { getSeasonalTheme } from "@/lib/seasonal-themes";
import { tmdbMetadataService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { getDiscoveryCardStates } from "@/server/application/discovery-card.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const selection = parseSeasonalSelection(params, user.seasonalThemes?.[0]);
  const theme = getSeasonalTheme(selection.theme)!;
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(500, requestedPage) : 1;
  const result = await tmdbMetadataService.getSeasonalForUser(
    user.id,
    theme.keyword,
    params.get("locale") ?? user.locale,
    selection.type,
    page,
    selection,
    selection.scope,
  );
  const states = await getDiscoveryCardStates(user.id, result.results);
  return NextResponse.json({ ...result, ...states });
}
