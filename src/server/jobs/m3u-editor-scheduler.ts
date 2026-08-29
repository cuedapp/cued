import { logger } from "@/lib/logger";

const schedulerKey = Symbol.for("cued.m3uEditorScheduler");
const schedulerState = globalThis as typeof globalThis & { [schedulerKey]?: NodeJS.Timeout };

export function startM3uEditorScheduler() {
  if (schedulerState[schedulerKey]) return;
  const run = async () => { try { const { m3uEditorIntegrationService } = await import("@/server/application/services"); const overview = await m3uEditorIntegrationService.getOverview(); if (overview.configured) await m3uEditorIntegrationService.refresh(); } catch (error) { logger.error("Scheduled M3U Editor availability refresh failed", { error: error instanceof Error ? error.message : "Unknown error" }); } };
  const initial = setTimeout(() => { void run(); const interval = setInterval(() => void run(), 6 * 60 * 60 * 1_000); interval.unref(); schedulerState[schedulerKey] = interval; }, 150_000);
  initial.unref(); schedulerState[schedulerKey] = initial;
}
