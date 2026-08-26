import { getCurrentUser } from "@/server/auth/session";
import { mediaSyncService } from "@/server/application/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!mediaSyncService) return Response.json({ run: null });

  const run = await mediaSyncService.getLatestRun();
  return Response.json({
    run: run ? {
      id: run.id,
      status: run.status,
      mode: run.mode,
      phase: run.phase,
      currentLabel: run.currentLabel,
      librariesProcessed: run.librariesProcessed,
      librariesTotal: run.librariesTotal,
      itemsProcessed: run.itemsProcessed,
      usersProcessed: run.usersProcessed,
      usersTotal: run.usersTotal,
      startedAt: run.startedAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      error: run.error,
    } : null,
  });
}
