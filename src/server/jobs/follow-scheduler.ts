import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.followScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startFollowScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { followService } = await import("@/server/application/services");
      await followService.refreshDue();
    } catch (error) {
      logger.error("Scheduled follow refresh failed", { error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 60 * 60 * 1_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 90_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
