import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  mediaRatingService,
  mediaSyncService,
  m3uEditorIntegrationService,
  recommendationService,
  strmImportService,
} from "@/server/application/services";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [recommendations, jellyfin, strm, ratings, m3u] = await Promise.all([
    recommendationService.getStatus(user.id),
    mediaSyncService?.getLatestRun(),
    strmImportService.getPendingForUser(user.id, user.role === "admin"),
    user.role === "admin" ? mediaRatingService.getActiveRun() : Promise.resolve(undefined),
    user.role === "admin" ? m3uEditorIntegrationService.getActiveRun() : Promise.resolve(undefined),
  ]);
  const jobs = [
    recommendations.run?.status === "running"
      ? { id: recommendations.run.id, label: "recommendations", href: "/recommendations" }
      : undefined,
    jellyfin?.status === "running" && (user.role === "admin" || jellyfin.requestedByUserId === user.id)
      ? { id: jellyfin.id, label: "jellyfin", href: "/settings/integrations/jellyfin" }
      : undefined,
    ratings?.status === "running" ? { id: ratings.id, label: "mediaRatings", href: "/activity" } : undefined,
    m3u?.status === "running" ? { id: m3u.id, label: "m3u", href: "/settings/integrations/m3u-editor" } : undefined,
    ...strm.map((job) => ({ id: job.id, label: "strm", href: "/activity" })),
  ].filter((job): job is NonNullable<typeof job> => Boolean(job));
  return NextResponse.json({ jobs });
}
