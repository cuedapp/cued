import type { ActivityRepository } from "@/server/db/repositories/activity.repository";

const trendDays = 7;
const statisticsTrendDays = 14;

export class ActivityService {
  constructor(private readonly repository: ActivityRepository) {}

  async getDashboardActivity(userId: string, now = new Date()) {
    const since = startOfUtcWeek(now);
    const [recent, watchSeconds, popular, topRated, trendRows] = await Promise.all([
      this.repository.getRecentActivity(userId),
      this.repository.getEstimatedWatchSeconds(userId),
      this.repository.getPopularTitles(userId),
      this.repository.getTopRatedTitles(userId),
      this.repository.getRecentTrend(userId, since),
    ]);
    const trendByDay = new Map(trendRows.map((row) => [row.day, Number(row.titles)]));
    return {
      recent,
      estimatedWatchSeconds: Math.round(watchSeconds),
      popular: popular.map((item) => ({ ...item, watchers: Number(item.watchers) })),
      topRated: topRated.map((item) => ({
        ...item,
        averageRating: Number(item.averageRating),
        ratings: Number(item.ratings),
      })),
      trend: Array.from({ length: trendDays }, (_, index) => {
        const day = new Date(since.getTime() + index * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
        return { day, titles: trendByDay.get(day) ?? 0 };
      }),
    };
  }

  async getAdminUserSummaries() {
    const [users, recentActivity] = await Promise.all([
      this.repository.getUserSummaries(),
      this.repository.getRecentActivityForUsers(),
    ]);
    const recentByUser = new Map<
      string,
      Array<{
        name: string;
        kind: "movie" | "episode";
        tmdbId: number | null;
        titleType: "movie" | "series";
        seriesName: string | null;
        seasonNumber: number | null;
        episodeNumber: number | null;
        lastPlayedAt: Date;
      }>
    >();
    for (const item of recentActivity) {
      if (!item.lastPlayedAt) continue;
      recentByUser.set(item.userId, [
        ...(recentByUser.get(item.userId) ?? []),
        {
          name: item.name,
          kind: item.kind as "movie" | "episode",
          tmdbId: item.tmdbId,
          titleType: item.titleType,
          seriesName: item.seriesName,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          lastPlayedAt: new Date(item.lastPlayedAt),
        },
      ]);
    }
    return users.map((user) => ({
      ...user,
      ...(user.lastPlayedAt ? { lastPlayedAt: new Date(user.lastPlayedAt) } : {}),
      watchedTitles: Number(user.watchedTitles),
      estimatedWatchSeconds: Math.round(Number(user.estimatedSeconds)),
      ratings: Number(user.ratings),
      averageRating: user.averageRating === null ? null : Number(user.averageRating),
      recent: recentByUser.get(user.id) ?? [],
    }));
  }

  async getUserSummary(userId: string) {
    const user = await this.repository.getUserSummary(userId);
    if (!user) return undefined;
    return {
      ...user,
      lastPlayedAt: user.lastPlayedAt ? new Date(user.lastPlayedAt) : null,
      watchedTitles: Number(user.watchedTitles),
      estimatedWatchSeconds: Math.round(Number(user.estimatedSeconds)),
      ratings: Number(user.ratings),
      averageRating: user.averageRating === null ? null : Number(user.averageRating),
    };
  }

  async getServerStatistics() {
    const trendSince = new Date();
    trendSince.setUTCDate(trendSince.getUTCDate() - (statisticsTrendDays - 1));
    trendSince.setUTCHours(0, 0, 0, 0);
    const [library, activity, ratings, mostWatched, highestRated, lowestRated, trendRows] = await Promise.all([
      this.repository.getLibrarySummary(),
      this.repository.getServerActivitySummary(),
      this.repository.getServerRatingSummary(),
      this.repository.getServerMostWatched(),
      this.repository.getServerRatedTitles("desc"),
      this.repository.getServerRatedTitles("asc"),
      this.repository.getServerTrend(trendSince),
    ]);
    const trendByDay = new Map(trendRows.map((row) => [row.day, Number(row.titles)]));
    return {
      movies: Number(library?.movies ?? 0),
      series: Number(library?.series ?? 0),
      users: Number(activity?.users ?? 0),
      lastPlayedAt: activity?.lastPlayedAt ? new Date(activity.lastPlayedAt) : null,
      watchedTitles: Number(activity?.watchedTitles ?? 0),
      estimatedWatchSeconds: Math.round(Number(activity?.estimatedSeconds ?? 0)),
      ratings: Number(ratings?.ratings ?? 0),
      averageRating:
        ratings?.averageRating === null || ratings?.averageRating === undefined ? null : Number(ratings.averageRating),
      mostWatched: mostWatched.map((item) => ({ ...item, watchers: Number(item.watchers) })),
      highestRated: highestRated.map((item) => ({
        ...item,
        averageRating: Number(item.averageRating),
        ratings: Number(item.ratings),
      })),
      lowestRated: lowestRated.map((item) => ({
        ...item,
        averageRating: Number(item.averageRating),
        ratings: Number(item.ratings),
      })),
      trend: Array.from({ length: statisticsTrendDays }, (_, index) => {
        const day = new Date(trendSince.getTime() + index * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
        return { day, titles: trendByDay.get(day) ?? 0 };
      }),
    };
  }

  async getStatisticsTrend(userId?: string, now = new Date()) {
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - (statisticsTrendDays - 1));
    since.setUTCHours(0, 0, 0, 0);
    const rows = userId
      ? await this.repository.getRecentTrend(userId, since)
      : await this.repository.getServerTrend(since);
    const trendByDay = new Map(rows.map((row) => [row.day, Number(row.titles)]));
    return Array.from({ length: statisticsTrendDays }, (_, index) => {
      const day = new Date(since.getTime() + index * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
      return { day, titles: trendByDay.get(day) ?? 0 };
    });
  }

  async getStatisticsInsights(userId?: string) {
    const insights = await this.repository.getStatisticsInsights(userId);
    return {
      genres: insights.genres.map((item) => ({ ...item, count: Number(item.count) })),
      completionTypes: insights.completionTypes.map((item) => ({ ...item, count: Number(item.count) })),
      ratings: insights.ratings.map((item) => ({ rating: item.rating ?? 0, count: Number(item.count) })),
      viewingTimes: insights.viewingTimes.map((item) => ({ ...item, count: Number(item.count) })),
    };
  }
}

function startOfUtcWeek(value: Date) {
  const day = value.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() - daysSinceMonday));
}
