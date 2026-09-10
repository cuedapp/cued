import { getLocale, getTranslations } from "next-intl/server";
import { formatDisplayTime, formatRelativeDate } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import { tasteService } from "@/server/application/services";
import { HistoryFilters } from "./history-filters";
import { PageIntro } from "@/components/page-intro";
import { HistoryBrowser, type HistoryBrowserItem } from "./history-browser";

type HistoryParams = { query?: string; filter?: string; sort?: string; type?: string; status?: string };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<HistoryParams> }) {
  const user = await getCurrentUser();
  const t = await getTranslations("History");
  const locale = await getLocale();
  if (!user) return null;
  const params = await searchParams;
  const filter = member(params.filter, ["all", "rated", "unrated", "excluded"], "all");
  const sort = member(params.sort, ["recent", "rating", "title"], "recent");
  const type = member(params.type, ["all", "movie", "series", "season"], "all");
  const status = member(params.status, ["completed", "inProgress", "all"], "all");
  const queryText = (params.query ?? "").trim().slice(0, 100);
  const allHistory = await tasteService.getHistory(user.id);
  const tagOrder = getTagOrder(allHistory.flatMap((item) => item.tags ?? []));
  const history = allHistory
    .filter((item) => status === "all" || (status === "completed" ? item.played : !item.played))
    .filter((item) =>
      type === "season"
        ? item.kind === "season"
        : (item.kind === "movie" || item.kind === "series") && (type === "all" || item.kind === type),
    )
    .filter(
      (item) =>
        filter === "all" ||
        (filter === "rated" && item.rating !== null) ||
        (filter === "unrated" && item.rating === null) ||
        (filter === "excluded" && item.excluded === true),
    )
    .filter((item) => item.name.toLocaleLowerCase().includes(queryText.toLocaleLowerCase()))
    .sort((a, b) =>
      sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : sort === "title" ? a.name.localeCompare(b.name) : 0,
    );
  const query = { query: queryText, filter, sort, type, status };
  const now = new Date();
  const historyItems: HistoryBrowserItem[] = history.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind as HistoryBrowserItem["kind"],
    tmdbId: item.tmdbId,
    seriesTmdbId: item.seriesTmdbId,
    seriesName: item.seriesName,
    removedAt: item.removedAt?.toISOString() ?? null,
    played: item.played,
    rating: item.rating,
    feedback: item.feedback,
    tags: item.tags ?? [],
    excluded: item.excluded,
    watchedLabel: item.lastPlayedAt
      ? t("watchedAt", {
          date: formatRelativeDate(item.lastPlayedAt, now, locale, user.dateFormat),
          time: formatDisplayTime(item.lastPlayedAt, user.timeFormat, locale),
        })
      : t("watched"),
    progressLabel: `${t(`types.${item.kind}`)} · ${
      item.played
        ? t(item.kind === "series" ? "caughtUp" : "completed")
        : t("inProgress", { percentage: Math.round(item.playedPercentage ?? 0) })
    }`,
    unavailableLabel: t("notAvailable"),
  }));
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <HistoryFilters query={query} />
      <HistoryBrowser
        key={`${query.query}:${query.filter}:${query.sort}:${query.type}:${query.status}`}
        items={historyItems}
        tagOrder={tagOrder}
      />
    </div>
  );
}

function getTagOrder(allTags: string[]) {
  const counts = new Map<string, number>();
  for (const tag of allTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
}

function member<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  fallback: T[number],
): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
