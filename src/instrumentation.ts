export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startRecommendationScheduler } = await import("@/server/jobs/recommendation-scheduler");
  startRecommendationScheduler();
  const { startFollowScheduler } = await import("@/server/jobs/follow-scheduler");
  startFollowScheduler();
  const { startNotificationScheduler } = await import("@/server/jobs/notification-scheduler");
  startNotificationScheduler();
  const { startM3uEditorScheduler } = await import("@/server/jobs/m3u-editor-scheduler");
  startM3uEditorScheduler();
  const { startStrmImportScheduler } = await import("@/server/jobs/strm-import-scheduler");
  startStrmImportScheduler();
}
