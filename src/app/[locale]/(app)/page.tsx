import { Clock3, Sparkles, Star, TrendingUp, Undo2, UsersRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  activityService,
  radarrIntegrationService,
  recommendationService,
  sonarrIntegrationService,
} from "@/server/application/services";
import { RecommendationRefreshButton } from "@/components/recommendation-progress";
import { RecommendationGridCard } from "@/components/recommendation-grid-card";
import { updateRecommendationFeedback } from "./recommendation-actions";
import { formatRelativeDate } from "@/lib/date-time";
import { formatActivityWeekday, formatEstimatedWatchTime } from "@/lib/activity-time";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import type { RequestOptions } from "@/components/request-button";

export default async function Dashboard() {
  const t = await getTranslations("Dashboard");
  const activityT = await getTranslations("Activity");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const [recommendations, hiddenRecommendations, activity] = user
    ? await Promise.all([
        recommendationService.getForDashboard(user.id).catch(() => []),
        recommendationService.getHidden(user.id).catch(() => []),
        activityService.getDashboardActivity(user.id).catch(() => undefined),
      ])
    : [[], [], undefined];
  const [radarr, sonarr] = user
    ? await Promise.all([radarrIntegrationService.getOverview(), sonarrIntegrationService.getOverview()])
    : [undefined, undefined];
  const allowRequestOptions = Boolean(user && (user.role === "admin" || !user.requestsRequireApproval));
  const [radarrOptions, sonarrOptions] =
    user && allowRequestOptions
      ? await Promise.all([
          radarr?.configured
            ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
            : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
          sonarr?.configured
            ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
            : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
        ])
      : [
          { rootFolders: [], qualityProfiles: [], tags: [] },
          { rootFolders: [], qualityProfiles: [], tags: [] },
        ];
  const requestStates = user
    ? await acquisitionService
        .getStates(recommendations.map((item) => ({ type: item.mediaType as "movie" | "series", tmdbId: item.tmdbId })))
        .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">)
    : {};
  const requestContext = {
    requestable: { movie: radarr?.configured ?? false, series: sonarr?.configured ?? false },
    options: {
      movie: {
        rootFolders: radarrOptions.rootFolders,
        profiles: radarrOptions.qualityProfiles,
        defaultRootFolderPath: radarr?.rootFolderPath,
        defaultProfileId: radarr?.qualityProfileId,
      },
      series: {
        rootFolders: sonarrOptions.rootFolders,
        profiles: sonarrOptions.qualityProfiles,
        defaultRootFolderPath: sonarr?.rootFolderPath,
        defaultProfileId: sonarr?.qualityProfileId,
      },
    },
    allowOptions: allowRequestOptions,
    states: requestStates,
  };
  const movieRecommendations = recommendations.filter((item) => item.mediaType === "movie").slice(0, 6);
  const seriesRecommendations = recommendations.filter((item) => item.mediaType === "series").slice(0, 6);
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-4xl border border-border/60 bg-card px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-40 w-64 rotate-[-8deg] rounded-t-[5rem] border border-primary/15 bg-linear-to-t from-primary/12 to-transparent sm:block" />
        <div className="relative max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-4" />
            {t("eyebrow")}
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tighter sm:text-6xl">
            <DashboardGreeting />
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{t("intro")}</p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight">{t("recommendationsTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("recommendationsBody")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/recommendations" className="text-sm font-medium text-primary hover:underline">
              {t("viewAll")}
            </Link>
            <RecommendationRefreshButton />
          </div>
        </div>
        {recommendations.length === 0 ? (
          <Card className="p-8 text-center">
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription className="mt-2">{t("emptyBody")}</CardDescription>
          </Card>
        ) : (
          <div className="space-y-8">
            {movieRecommendations.length > 0 && (
              <RecommendationSection
                title={t("moviesForYou")}
                items={movieRecommendations}
                requestContext={requestContext}
              />
            )}
            {seriesRecommendations.length > 0 && (
              <RecommendationSection
                title={t("seriesForYou")}
                items={seriesRecommendations}
                requestContext={requestContext}
              />
            )}
          </div>
        )}
      </section>

      {hiddenRecommendations.length > 0 && (
        <details className="rounded-2xl border border-border bg-card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
            {t("hiddenRecommendations", { count: hiddenRecommendations.length })}
          </summary>
          <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
            {hiddenRecommendations.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <span className="truncate text-sm font-medium">{item.title}</span>
                <form
                  action={async (formData) => {
                    await updateRecommendationFeedback(formData);
                  }}
                >
                  <input type="hidden" name="recommendationId" value={item.id} />
                  <button
                    name="feedback"
                    value="restore"
                    className="inline-flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Undo2 className="size-4" />
                    {t("restore")}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}

      {user && activity && (
        <ServerActivity activity={activity} locale={locale} dateFormat={user.dateFormat} t={activityT} />
      )}

      <div>
        <Card className="min-h-48">
          <CardHeader>
            <CardTitle>{t("tasteTitle")}</CardTitle>
            <CardDescription>{t("tasteBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/history" className="text-sm font-medium text-primary hover:underline">
              {t("rateMore")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DashboardActivity = Awaited<ReturnType<typeof activityService.getDashboardActivity>>;

function ServerActivity({
  activity,
  locale,
  dateFormat,
  t: translate,
}: {
  activity: DashboardActivity;
  locale: string;
  dateFormat: string;
  t: Awaited<ReturnType<typeof getTranslations<"Activity">>>;
}) {
  const t = (key: string, values?: Record<string, string | number>) =>
    key === "episode"
      ? `${values?.season ?? "–"}x${values?.episode ?? "–"} · ${values?.title ?? ""}`
      : (translate as (translationKey: string, translationValues?: Record<string, string | number>) => string)(
          key,
          values,
        );
  const trendMaximum = Math.max(1, ...activity.trend.map((item) => item.titles));
  const watchTime = formatEstimatedWatchTime(activity.estimatedWatchSeconds);
  const hasWeeklyActivity = activity.trend.some((item) => item.titles > 0);
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" />
              <CardTitle className="text-lg">{t("recentTitle")}</CardTitle>
            </div>
            <CardDescription>{t("recentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
            ) : (
              <ul className="space-y-3">
                {activity.recent.map((item) => (
                  <li
                    key={`${item.name}:${item.lastPlayedAt?.toISOString()}`}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.kind === "episode" ? (item.seriesName ?? item.name) : item.name}
                      </span>
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
                      {item.lastPlayedAt ? formatRelativeDate(item.lastPlayedAt, new Date(), locale, dateFormat) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-lg">{t("trendTitle")}</CardTitle>
            </div>
            <CardDescription>{t("trendDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {hasWeeklyActivity ? (
              <div className="flex h-32 items-end gap-2" aria-label={t("trendLabel")} role="img">
                {activity.trend.map((item) => (
                  <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${Math.max(item.titles > 0 ? 8 : 2, (item.titles / trendMaximum) * 100)}%` }}
                      title={t("trendDay", { day: item.day, titles: item.titles })}
                    />
                    <span className="whitespace-nowrap text-center text-[10px] text-muted-foreground">
                      {formatActivityWeekday(item.day, locale)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("trendEmpty")}</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <ActivityList
          icon={<Clock3 className="size-4" />}
          title={t("watchTimeTitle")}
          description={t("watchTimeDescription")}
        >
          <p className="font-display text-3xl font-semibold">
            {t(watchTime.unit, { hours: watchTime.value, days: watchTime.value, weeks: watchTime.value })}
          </p>
        </ActivityList>
        <ActivityList
          icon={<UsersRound className="size-4" />}
          title={t("popularTitle")}
          description={t("popularDescription")}
        >
          {activity.popular.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("serverEmpty")}</p>
          ) : (
            <ol className="space-y-2">
              {activity.popular.map((item) => (
                <li key={`${item.kind}:${item.name}`} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground">{t("viewers", { count: item.watchers })}</span>
                </li>
              ))}
            </ol>
          )}
        </ActivityList>
        <ActivityList
          icon={<Star className="size-4" />}
          title={t("ratingsTitle")}
          description={t("ratingsDescription")}
        >
          {activity.topRated.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("serverEmpty")}</p>
          ) : (
            <ol className="space-y-2">
              {activity.topRated.map((item) => (
                <li key={`${item.kind}:${item.name}`} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {t("rating", { rating: item.averageRating, count: item.ratings })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ActivityList>
      </div>
    </section>
  );
}

function ActivityList({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <CardTitle className="text-lg text-foreground">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type RecommendationItem = Awaited<ReturnType<typeof recommendationService.getForDashboard>>[number];

type DashboardRequestContext = {
  requestable: { movie: boolean; series: boolean };
  options: { movie: RequestOptions; series: RequestOptions };
  allowOptions: boolean;
  states: Record<string, "idle" | "pending" | "existing">;
};

async function RecommendationSection({
  title,
  items,
  requestContext,
}: {
  title: string;
  items: RecommendationItem[];
  requestContext: DashboardRequestContext;
}) {
  const t = await getTranslations("Dashboard");
  return (
    <section>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => {
          const liked = item.sourceTitles.filter((source) => source.reason === "liked");
          const watched = item.sourceTitles.filter((source) => source.reason === "watched");
          const requestable = requestContext.requestable[item.mediaType as "movie" | "series"];
          const hasRequest = requestable || item.m3uAvailable;
          return (
            <RecommendationGridCard
              key={item.id}
              item={item}
              labels={{
                available: t("available"),
                strmAvailable: t("strmAvailable"),
                strmPending: t("strmPending"),
                strmRequestable: t("strmRequestable"),
                type: t(`types.${item.mediaType}`),
                becauseLiked:
                  liked.length > 0
                    ? t("becauseTitles", { titles: liked.map((source) => source.title).join(", ") })
                    : undefined,
                becauseWatched:
                  watched.length > 0
                    ? t("becauseWatched", { titles: watched.map((source) => source.title).join(", ") })
                    : undefined,
                becauseGenres:
                  item.sourceTitles.length === 0 && item.reasons.length > 0
                    ? t("because", { reasons: item.reasons.join(", ") })
                    : undefined,
              }}
              request={
                hasRequest
                  ? {
                      type: item.mediaType as "movie" | "series",
                      tmdbId: item.tmdbId,
                      options: requestContext.options[item.mediaType as "movie" | "series"],
                      allowOptions: requestContext.allowOptions,
                      arrAvailable: requestable,
                      strmAvailable: item.m3uAvailable && !item.available && !item.strmAvailable && !item.strmPending,
                      strmAlreadyAvailable: item.strmAvailable,
                      strmImportPending: item.strmPending,
                      initialState: item.available
                        ? "available"
                        : (requestContext.states[`${item.mediaType}:${item.tmdbId}`] ?? "idle"),
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
