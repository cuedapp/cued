import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { applicationSettings } from "@/server/db/schema";

const settingsId = 1;

export type VisibilitySettings = {
  showServerStatisticsToUsers: boolean;
  showRecentActivityToUsers: boolean;
};

export class VisibilityRepository {
  async get(): Promise<VisibilitySettings> {
    const row = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.id, settingsId),
    });
    return {
      showServerStatisticsToUsers: row?.showServerStatisticsToUsers ?? false,
      showRecentActivityToUsers: row?.showRecentActivityToUsers ?? false,
    };
  }

  async save(settings: VisibilitySettings) {
    await db
      .insert(applicationSettings)
      .values({ id: settingsId, ...settings, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: applicationSettings.id,
        set: { ...settings, updatedAt: new Date() },
      });
  }
}

export const visibilityRepository = new VisibilityRepository();
