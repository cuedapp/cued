import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.recommendationScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startRecommendationScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { recommendationService } = await import("@/server/application/services");
      await recommendationService.refreshDue();
    } catch (error) {
      logger.error("Scheduled recommendation refresh failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 60 * 1_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 60_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
