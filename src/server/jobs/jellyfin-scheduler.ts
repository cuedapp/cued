import { logger } from "@/lib/logger";
import { serializeJellyfinSyncNotification } from "@/lib/jellyfin-sync-notification";

const schedulerKey = Symbol.for("cued.jellyfinScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startJellyfinScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { inAppNotificationService, mediaSyncService } = await import("@/server/application/services");
      if (await mediaSyncService?.syncDue()) {
        const run = await mediaSyncService?.getLatestRun();
        if (!run) return;
        await inAppNotificationService.notifyAdmins(
          "jellyfin.completed",
          "/settings/integrations/jellyfin",
          serializeJellyfinSyncNotification({
            libraries: run.librariesProcessed,
            items: run.itemsProcessed,
            users: run.usersProcessed,
          }),
        );
      }
    } catch (error) {
      const { inAppNotificationService } = await import("@/server/application/services");
      await inAppNotificationService.notifyAdmins("jellyfin.failed", "/settings/integrations/jellyfin");
      logger.error("Scheduled Jellyfin synchronization failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 60_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 60_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
