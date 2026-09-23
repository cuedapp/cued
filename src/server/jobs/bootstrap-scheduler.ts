import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.bootstrapScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startBootstrapScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => {
    try {
      const { bootstrapService } = await import("@/server/application/services");
      await bootstrapService?.reconcile();
    } catch (error) {
      logger.error("Installation bootstrap reconciliation failed", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  };
  const initial = setTimeout(() => {
    void run();
    const interval = setInterval(() => void run(), 5_000);
    interval.unref();
    schedulerState[schedulerKey] = interval;
  }, 5_000);
  initial.unref();
  schedulerState[schedulerKey] = initial;
}
