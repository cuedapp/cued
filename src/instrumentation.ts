export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startRecommendationScheduler } = await import("@/server/jobs/recommendation-scheduler");
  startRecommendationScheduler();
}
