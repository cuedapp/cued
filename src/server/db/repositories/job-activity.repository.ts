import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrationSyncRuns, jobRuns, recommendationRuns } from "@/server/db/schema";

export class JobActivityRepository {
  getRecommendationRuns(userId: string) {
    return db.query.recommendationRuns.findMany({
      where: eq(recommendationRuns.userId, userId),
      orderBy: (run, { desc }) => desc(run.startedAt),
      limit: 100,
    });
  }

  getRequestImportRuns(userId: string, includeAll: boolean) {
    return db.query.jobRuns.findMany({
      ...(includeAll ? {} : { where: eq(jobRuns.requesterId, userId) }),
      orderBy: (run, { desc }) => desc(run.startedAt),
      limit: 100,
    });
  }

  getIntegrationSyncRuns() {
    return db
      .select({
        id: integrationSyncRuns.id,
        status: integrationSyncRuns.status,
        phase: integrationSyncRuns.phase,
        startedAt: integrationSyncRuns.startedAt,
        finishedAt: integrationSyncRuns.finishedAt,
        error: integrationSyncRuns.error,
        itemsProcessed: integrationSyncRuns.itemsProcessed,
        librariesProcessed: integrationSyncRuns.librariesProcessed,
      })
      .from(integrationSyncRuns)
      .orderBy(desc(integrationSyncRuns.startedAt))
      .limit(100);
  }
}
