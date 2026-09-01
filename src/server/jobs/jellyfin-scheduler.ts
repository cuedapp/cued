import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.jellyfinScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startJellyfinScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { inAppNotificationService, mediaSyncService } = await import("@/server/application/services");
      if (await mediaSyncService?.syncDue())
        await inAppNotificationService.notifyAdmins("jellyfin.completed", "/settings/integrations/jellyfin");
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
