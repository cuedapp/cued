import { describe, expect, it, vi } from "vitest";
import { ActivityService } from "@/server/application/activity.service";
import type { ActivityRepository } from "@/server/db/repositories/activity.repository";
import { formatEstimatedWatchTime } from "@/lib/activity-time";

describe("ActivityService", () => {
  it("assembles private activity with visible server aggregates and fills missing trend days", async () => {
    const repository = {
      getRecentActivity: vi.fn().mockResolvedValue([{ name: "Recent film", kind: "movie", lastPlayedAt: new Date("2026-08-29T12:00:00Z"), playCount: 1 }]),
      getEstimatedWatchSeconds: vi.fn().mockResolvedValue(7_200),
      getPopularTitles: vi.fn().mockResolvedValue([{ name: "Popular film", kind: "movie", watchers: "3" }]),
      getTopRatedTitles: vi.fn().mockResolvedValue([{ name: "Rated series", kind: "series", averageRating: "4.5", ratings: "2" }]),
      getRecentTrend: vi.fn().mockResolvedValue([{ day: "2026-08-29", titles: "2" }]),
      getUserSummaries: vi.fn(),
      getRecentActivityForUsers: vi.fn().mockResolvedValue([]),
    } as unknown as ActivityRepository;

    const activity = await new ActivityService(repository).getDashboardActivity("user", new Date("2026-08-29T18:00:00Z"));

    expect(activity.estimatedWatchSeconds).toBe(7_200);
    expect(activity.popular).toEqual([{ name: "Popular film", kind: "movie", watchers: 3 }]);
    expect(activity.topRated).toEqual([{ name: "Rated series", kind: "series", averageRating: 4.5, ratings: 2 }]);
    expect(activity.trend).toHaveLength(7);
    expect(activity.trend[0]).toEqual({ day: "2026-08-24", titles: 0 });
    expect(activity.trend[5]).toEqual({ day: "2026-08-29", titles: 2 });
    expect(activity.trend[6]).toEqual({ day: "2026-08-30", titles: 0 });
    expect(activity.trend[0]?.titles).toBe(0);
    expect(repository.getPopularTitles).toHaveBeenCalledWith("user");
  });

  it("uses days and weeks for large watch-time totals", () => {
    expect(formatEstimatedWatchTime(23 * 3_600)).toEqual({ value: 23, unit: "hours" });
    expect(formatEstimatedWatchTime(3 * 24 * 3_600)).toEqual({ value: 3, unit: "days" });
    expect(formatEstimatedWatchTime(15 * 24 * 3_600)).toEqual({ value: 2.1, unit: "weeks" });
  });

  it("normalizes aggregate timestamp values for the admin statistics page", async () => {
    const repository = {
      getUserSummaries: vi.fn().mockResolvedValue([{ id: "user", displayName: "Erik", lastPlayedAt: "2026-08-29T12:00:00.000Z", watchedTitles: "4", estimatedSeconds: "7200", ratings: "2", averageRating: "4.5" }]),
      getRecentActivityForUsers: vi.fn().mockResolvedValue([{ userId: "user", name: "Recent film", kind: "movie", lastPlayedAt: "2026-08-29T12:00:00.000Z" }]),
    } as unknown as ActivityRepository;

    const summaries = await new ActivityService(repository).getAdminUserSummaries();

    expect(summaries[0]?.lastPlayedAt).toEqual(new Date("2026-08-29T12:00:00.000Z"));
    expect(summaries[0]?.recent).toEqual([{ name: "Recent film", kind: "movie", lastPlayedAt: new Date("2026-08-29T12:00:00.000Z") }]);
  });
});
