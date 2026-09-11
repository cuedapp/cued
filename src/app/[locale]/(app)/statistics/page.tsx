import { BarChart3, Clock3, Film, Star, Tv, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { activityService, visibilityService } from "@/server/application/services";
import { formatEstimatedWatchTime } from "@/lib/activity-time";
import { formatRelativeDate } from "@/lib/date-time";
import { PageIntro } from "@/components/page-intro";
import { StatisticsActivityChart } from "@/components/statistics/statistics-activity-chart";
import { StatisticsInsights, UserComparisonChart } from "@/components/statistics/statistics-insights";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) notFound();
  const visibility = await visibilityService.getSettings();
  if (user.role !== "admin" && !visibility.showServerStatisticsToUsers) notFound();
  const [t, activityT, locale, summaries, server] = await Promise.all([
    getTranslations("Statistics"),
    getTranslations("Activity"),
    getLocale(),
    user.role === "admin" ? activityService.getAdminUserSummaries() : Promise.resolve([]),
    activityService.getServerStatistics(),
  ]);
  const serverWatchTime = formatEstimatedWatchTime(server.estimatedWatchSeconds);
  const selectedUserId = summaries.some((summary) => summary.id === params.user) ? params.user : undefined;
  const visibleSummaries = selectedUserId ? summaries.filter((summary) => summary.id === selectedUserId) : [];
  const selectedTrend = selectedUserId ? await activityService.getStatisticsTrend(selectedUserId) : null;
  const insights = await activityService.getStatisticsInsights(selectedUserId);
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t("serverTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("serverDescription")}</p>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="grid grid-cols-2 gap-px bg-border/70 p-0 sm:grid-cols-3">
            <StatCard icon={<Film className="size-4" />} label={t("movies")} value={server.movies} />
            <StatCard icon={<Tv className="size-4" />} label={t("series")} value={server.series} />
            <StatCard icon={<UsersRound className="size-4" />} label={t("users")} value={server.users} />
            <StatCard
              icon={<Clock3 className="size-4" />}
              label={t("watchTime")}
              value={activityT(serverWatchTime.unit, {
                hours: serverWatchTime.value,
                days: serverWatchTime.value,
                weeks: serverWatchTime.value,
              })}
            />
            <StatCard icon={<BarChart3 className="size-4" />} label={t("watchedTitles")} value={server.watchedTitles} />
            <StatCard icon={<Star className="size-4" />} label={t("ratings")} value={server.ratings} />
          </CardContent>
        </Card>
        <ActivityTrend
          trend={server.trend}
          title={t("trendTitle")}
          description={t("trendDescription")}
          label={t("trendLabel")}
          dayLabel={(day, titles) => t("trendDay", { day, titles })}
          empty={t("trendEmpty")}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <TitleList
            title={t("mostWatched")}
            items={server.mostWatched}
            empty={t("noTitleData")}
            value={(item) => t("viewers", { count: item.watchers ?? 0 })}
          />
          <TitleList
            title={t("highestRated")}
            items={server.highestRated}
            empty={t("noTitleData")}
            value={(item) => t("rating", { rating: item.averageRating ?? 0, count: item.ratings ?? 0 })}
          />
          <TitleList
            title={t("lowestRated")}
            items={server.lowestRated}
            empty={t("noTitleData")}
            value={(item) => t("rating", { rating: item.averageRating ?? 0, count: item.ratings ?? 0 })}
          />
        </div>
      </section>
      {user.role === "admin" && (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{t("usersTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("usersDescription")}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("showingUsers", { count: selectedUserId ? 1 : summaries.length, total: summaries.length })}
            </p>
          </div>
          <div
            className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1"
            role="tablist"
            aria-label={t("userFilter")}
          >
            <UserFilter active={!selectedUserId} href={{ pathname: "/statistics", query: {} }} label={t("allUsers")} />
            {summaries.map((summary) => (
              <UserFilter
                key={summary.id}
                active={selectedUserId === summary.id}
                href={{ pathname: "/statistics", query: { user: summary.id } }}
                label={summary.displayName}
              />
            ))}
          </div>
          {!selectedUserId && summaries.length > 0 && (
            <UserComparisonChart
              users={summaries.map((summary, index) => ({
                name: summary.displayName,
                watchHours: Math.round((summary.estimatedWatchSeconds / 3600) * 10) / 10,
                completed: summary.watchedTitles,
                ratings: summary.ratings,
                fill: [
                  "var(--primary)",
                  "oklch(0.68 0.13 168)",
                  "oklch(0.7 0.14 250)",
                  "oklch(0.75 0.13 90)",
                  "oklch(0.66 0.15 320)",
                  "oklch(0.65 0.09 220)",
                ][index % 6],
              }))}
              title={t("comparisonTitle")}
              description={t("comparisonDescription")}
              watchTimeLabel={t("watchHours")}
              completedLabel={t("watchedTitles")}
              ratingsLabel={t("ratings")}
            />
          )}
          {selectedTrend && (
            <ActivityTrend
              trend={selectedTrend}
              title={t("userTrendTitle", { user: visibleSummaries[0]?.displayName ?? "" })}
              description={t("userTrendDescription")}
              label={t("trendLabel")}
              dayLabel={(day, titles) => t("trendDay", { day, titles })}
              empty={t("trendEmpty")}
            />
          )}
          <StatisticsInsights
            insights={insights}
            labels={{
              insightsTitle: t("insightsTitle"),
              insightsDescription: t("insightsDescription"),
              chart: t("chart"),
              table: t("table"),
              empty: t("insightsEmpty"),
              genres: t("genres"),
              completionTypes: t("completionTypes"),
              ratings: t("ratings"),
              viewingTimes: t("viewingTimes"),
              movie: t("movies"),
              series: t("series"),
              count: t("count", { count: "{count}" }),
              viewingShare: t("viewingShare", { share: "{share}" }),
              hourlyBreakdown: t("hourlyBreakdown"),
              noViewingActivity: t("noViewingActivity"),
              days: {
                0: t("days.sun"),
                1: t("days.mon"),
                2: t("days.tue"),
                3: t("days.wed"),
                4: t("days.thu"),
                5: t("days.fri"),
                6: t("days.sat"),
              },
            }}
          />
          <div className="grid gap-5 xl:grid-cols-2">
            {visibleSummaries.map((summary) => {
              const watchTime = formatEstimatedWatchTime(summary.estimatedWatchSeconds);
              return (
                <Card key={summary.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <UsersRound className="size-4 text-primary" />
                      <CardTitle>{summary.displayName}</CardTitle>
                    </div>
                    <CardDescription>
                      {summary.lastPlayedAt
                        ? t("lastActive", {
                            date: formatRelativeDate(summary.lastPlayedAt, new Date(), locale, user.dateFormat),
                          })
                        : t("notActive")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <dl className="grid grid-cols-2 divide-x divide-border/70 rounded-xl border border-border/70 text-sm">
                      <div className="p-4">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          {t("watchTime")}
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {activityT(watchTime.unit, {
                            hours: watchTime.value,
                            days: watchTime.value,
                            weeks: watchTime.value,
                          })}
                        </dd>
                      </div>
                      <div className="p-4">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <BarChart3 className="size-3.5" />
                          {t("watchedTitles")}
                        </dt>
                        <dd className="mt-1 font-semibold">{summary.watchedTitles}</dd>
                      </div>
                      <div className="col-span-2 border-t border-border/70 p-4">
                        <dt className="flex items-center gap-1.5 text-muted-foreground">
                          <Star className="size-3.5" />
                          {t("ratings")}
                        </dt>
                        <dd className="mt-1 font-semibold">
                          {summary.averageRating === null
                            ? t("noRatings")
                            : t("rating", { rating: summary.averageRating, count: summary.ratings })}
                        </dd>
                      </div>
                    </dl>
                    <div className="border-t border-border/70 pt-5">
                      <h3 className="text-sm font-semibold">{t("recentTitle")}</h3>
                      {summary.recent.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">{t("recentEmpty")}</p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {summary.recent.map((item) => (
                            <li
                              key={`${item.kind}:${item.name}:${item.lastPlayedAt.toISOString()}`}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="min-w-0 flex-1">
                                {item.tmdbId ? (
                                  <Link
                                    href={`/title/${item.titleType}/${item.tmdbId}` as never}
                                    className="line-clamp-2 break-words font-medium hover:text-primary"
                                  >
                                    {item.kind === "episode" ? (item.seriesName ?? item.name) : item.name}
                                  </Link>
                                ) : (
                                  <span className="line-clamp-2 break-words font-medium">
                                    {item.kind === "episode" ? (item.seriesName ?? item.name) : item.name}
                                  </span>
                                )}
                                {item.kind === "episode" && (
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {t("episode", {
                                      season: item.seasonNumber ?? "–",
                                      episode: item.episodeNumber ?? "–",
                                      title: item.name,
                                    })}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-muted-foreground">
                                {formatRelativeDate(item.lastPlayedAt, new Date(), locale, user.dateFormat)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function UserFilter({
  active,
  href,
  label,
}: {
  active: boolean;
  href: { pathname: "/statistics"; query: { user?: string } };
  label: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      role="tab"
      aria-selected={active}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60 hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}

function ActivityTrend({
  trend,
  title,
  description,
  label,
  dayLabel,
  empty,
}: {
  trend: Array<{ day: string; titles: number }>;
  title: string;
  description: string;
  label: string;
  dayLabel: (day: string, titles: number) => string;
  empty: string;
}) {
  const hasActivity = trend.some((item) => item.titles > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasActivity ? (
          <StatisticsActivityChart
            trend={trend.map((item) => ({ ...item, tooltip: dayLabel(item.day, item.titles) }))}
            label={label}
          />
        ) : (
          <p className="grid h-40 place-items-center text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 font-display text-3xl font-semibold">{value}</dd>
    </div>
  );
}
type TitleStatistic = { name: string; watchers?: number; averageRating?: number; ratings?: number };
function TitleList({
  title,
  items,
  empty,
  value,
}: {
  title: string;
  items: TitleStatistic[];
  empty: string;
  value: (item: TitleStatistic) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        {items.length === 0 ? (
          <p className="px-6 pb-5 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ol className="divide-y divide-border/70 border-t border-border/70">
            {items.map((item, index) => (
              <li key={`${item.name}:${index}`} className="flex justify-between gap-3 px-6 py-3 text-sm">
                <span className="min-w-0 truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">{value(item)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
