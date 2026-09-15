import type { InAppNotificationService } from "./in-app-notification.service";
import type { MediaRatingService } from "./media-rating.service";
import type { MediaSyncService } from "./media-sync.service";
import type { M3uEditorIntegrationService } from "./m3u-editor-integration.service";
import type { RecommendationService } from "./recommendation.service";
import type { StrmImportService } from "./strm-import.service";

type StatusUser = { id: string; role: "user" | "admin" };

export class AppStatusService {
  constructor(
    private readonly recommendations: RecommendationService,
    private readonly notifications: InAppNotificationService,
    private readonly mediaSync?: MediaSyncService,
    private readonly strmImport?: StrmImportService,
    private readonly mediaRatings?: MediaRatingService,
    private readonly m3uEditor?: M3uEditorIntegrationService,
  ) {}

  async getForUser(user: StatusUser) {
    const [recommendations, jellyfin, strm, ratings, m3u, notifications] = await Promise.all([
      this.recommendations.getStatus(user.id),
      this.mediaSync?.getLatestRun(),
      this.strmImport?.getPendingForUser(user.id, user.role === "admin") ?? Promise.resolve([]),
      user.role === "admin" ? this.mediaRatings?.getActiveRun() : Promise.resolve(undefined),
      user.role === "admin" ? this.m3uEditor?.getActiveRun() : Promise.resolve(undefined),
      this.notifications.listUnread(user.id),
    ]);
    const jobs = [
      recommendations.run?.status === "running"
        ? { id: recommendations.run.id, label: "recommendations", href: "/recommendations" }
        : undefined,
      jellyfin?.status === "running" && (user.role === "admin" || jellyfin.requestedByUserId === user.id)
        ? { id: jellyfin.id, label: "jellyfin", href: "/settings/integrations/jellyfin" }
        : undefined,
      ratings?.status === "running" ? { id: ratings.id, label: "mediaRatings", href: "/activity" } : undefined,
      m3u?.status === "running" ? { id: m3u.id, label: "m3u", href: "/settings/integrations/m3u-editor" } : undefined,
      ...strm.map((job) => ({ id: job.id, label: "strm", href: "/activity" })),
    ].filter((job): job is NonNullable<typeof job> => Boolean(job));

    return { recommendations, jobs, notifications };
  }
}
