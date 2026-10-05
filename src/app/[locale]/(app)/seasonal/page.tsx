import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { parseSeasonalSelection } from "@/lib/seasonal-browsing";
import { getSeasonalTheme } from "@/lib/seasonal-themes";
import { getCurrentUser } from "@/server/auth/session";
import { tmdbMetadataService } from "@/server/application/services";
import type { SeasonalResult } from "@/server/application/tmdb-metadata.service";
import { getDiscoveryCardOptions, getDiscoveryCardStates } from "@/server/application/discovery-card.service";
import { SeasonalBrowser } from "./seasonal-browser";

export default async function SeasonalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, locale, t, params] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations("Seasonal"),
    searchParams,
  ]);
  if (!user) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
  }
  const selection = parseSeasonalSelection(query, user.seasonalThemes?.[0]);
  const theme = getSeasonalTheme(selection.theme)!;
  let initial: SeasonalResult = { page: 1, totalPages: 0, results: [] };
  let initialError = false;
  try {
    initial = await tmdbMetadataService.getSeasonalForUser(
      user.id,
      theme.keyword,
      locale,
      selection.type,
      1,
      selection,
      selection.scope,
    );
  } catch {
    initialError = true;
  }
  const [cardOptions, cardStates] = await Promise.all([
    getDiscoveryCardOptions(user),
    getDiscoveryCardStates(user.id, initial.results),
  ]);
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SeasonalBrowser
        key={JSON.stringify(selection)}
        locale={locale}
        dateFormat={user.dateFormat}
        initialSelection={selection}
        initial={{ ...initial, ...cardStates }}
        cardOptions={cardOptions}
        initialError={initialError}
      />
    </div>
  );
}
