import { logger } from "@/lib/logger";
import type { InAppNotificationService } from "@/server/application/in-app-notification.service";
import type { MediaRatingService } from "@/server/application/media-rating.service";

const schedulerKey = Symbol.for("cued.mediaRatingScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startMediaRatingScheduler() {
  if (schedulerState[schedulerKey]) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { inAppNotificationService, mediaRatingService } = await import("@/server/application/services");
      await runMediaRatingSync(mediaRatingService, inAppNotificationService);
    } catch (error) {
      logger.error("Scheduled media rating enrichment failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      running = false;
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 60 * 1_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 30_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}

export async function runMediaRatingSync(
  ratings: Pick<MediaRatingService, "enrichDue">,
  notifications: Pick<InAppNotificationService, "notifyAdmins">,
) {
  try {
    const result = await ratings.enrichDue();
    if (result.completed && result.checked > 0) await notifications.notifyAdmins("ratings.completed", "/library");
    return result;
  } catch (error) {
    await notifications.notifyAdmins("ratings.failed", "/library");
    throw error;
  }
}
