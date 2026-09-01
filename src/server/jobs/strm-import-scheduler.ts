import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.strmImportScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startStrmImportScheduler() {
  if (schedulerState[schedulerKey]) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { strmImportService } = await import("@/server/application/services");
      await strmImportService.processPending();
    } catch (error) {
      logger.error("Scheduled STRM Jellyfin import failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      running = false;
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 15_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 5_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
