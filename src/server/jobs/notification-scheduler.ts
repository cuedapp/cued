import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.notificationScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startNotificationScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try { const { notificationService } = await import("@/server/application/services"); await notificationService.dispatch(); }
    catch (error) { logger.error("Scheduled notification delivery failed", { error: error instanceof Error ? error.message : "Unknown error" }); }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 5 * 60 * 1_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 120_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
