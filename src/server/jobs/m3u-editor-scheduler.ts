import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.m3uEditorScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startM3uEditorScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { inAppNotificationService, m3uEditorIntegrationService } = await import("@/server/application/services");
      if (await m3uEditorIntegrationService.refreshDue())
        await inAppNotificationService.notifyAdmins("m3u.completed", "/settings/integrations/m3u-editor");
    } catch (error) {
      const { inAppNotificationService } = await import("@/server/application/services");
      await inAppNotificationService.notifyAdmins("m3u.failed", "/settings/integrations/m3u-editor");
      logger.error("Scheduled M3U Editor availability refresh failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 60_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 90_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
