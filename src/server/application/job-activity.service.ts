import type { JobActivityRepository } from "@/server/db/repositories/job-activity.repository";

export type ActivityRun = {
  id: string;
  kind: "recommendations" | "jellyfin" | "strm" | "mediaRatings" | "m3u";
  status: string;
  phase: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  detail: string | null;
};

export class JobActivityService {
  constructor(private readonly repository: JobActivityRepository) {}

  async list(userId: string, isAdmin: boolean) {
    const [recommendations, imports, syncs] = await Promise.all([
      this.repository.getRecommendationRuns(userId),
      this.repository.getRequestImportRuns(userId, isAdmin),
      isAdmin ? this.repository.getIntegrationSyncRuns() : Promise.resolve([]),
    ]);
    return [
      ...recommendations.map<ActivityRun>((run) => ({
        id: `recommendations:${run.id}`,
        kind: "recommendations",
        status: run.status,
        phase: run.phase,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error,
        detail: run.totalItems ? `${run.processedItems}/${run.totalItems}` : null,
      })),
      ...imports.map<ActivityRun>((run) => ({
        id: `job:${run.id}`,
        kind:
          run.jobName === "media-rating-sync"
            ? "mediaRatings"
            : run.jobName === "m3u-editor-availability-sync"
              ? "m3u"
              : "strm",
        status: run.status,
        phase: null,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error,
        detail: null,
      })),
      ...syncs.map<ActivityRun>((run) => ({
        id: `jellyfin:${run.id}`,
        kind: "jellyfin",
        status: run.status,
        phase: run.phase,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        error: run.error,
        detail: run.itemsProcessed
          ? String(run.itemsProcessed)
          : run.librariesProcessed
            ? String(run.librariesProcessed)
            : null,
      })),
    ]
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
      .slice(0, 150);
  }
}
