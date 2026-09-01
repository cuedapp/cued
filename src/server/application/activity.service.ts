import type { ActivityRepository } from "@/server/db/repositories/activity.repository";

const trendDays = 7;

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
      topRated: topRated.map((item) => ({ ...item, averageRating: Number(item.averageRating), ratings: Number(item.ratings) })),
      trend: Array.from({ length: trendDays }, (_, index) => {
        const day = new Date(since.getTime() + index * 24 * 60 * 60 * 1_000).toISOString().slice(0, 10);
        return { day, titles: trendByDay.get(day) ?? 0 };
      }),
    };
  }

  async getAdminUserSummaries() {
    const [users, recentActivity] = await Promise.all([this.repository.getUserSummaries(), this.repository.getRecentActivityForUsers()]);
    const recentByUser = new Map<string, Array<{ name: string; kind: "movie" | "episode"; seriesName: string | null; seasonNumber: number | null; episodeNumber: number | null; lastPlayedAt: Date }>>();
    for (const item of recentActivity) {
      if (!item.lastPlayedAt) continue;
      recentByUser.set(item.userId, [...(recentByUser.get(item.userId) ?? []), { name: item.name, kind: item.kind as "movie" | "episode", seriesName: item.seriesName, seasonNumber: item.seasonNumber, episodeNumber: item.episodeNumber, lastPlayedAt: new Date(item.lastPlayedAt) }]);
    }
    return users.map((user) => ({ ...user, ...(user.lastPlayedAt ? { lastPlayedAt: new Date(user.lastPlayedAt) } : {}), watchedTitles: Number(user.watchedTitles), estimatedWatchSeconds: Math.round(Number(user.estimatedSeconds)), ratings: Number(user.ratings), averageRating: user.averageRating === null ? null : Number(user.averageRating), recent: recentByUser.get(user.id) ?? [] }));
  }
}

function startOfUtcWeek(value: Date) {
  const day = value.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() - daysSinceMonday));
}
