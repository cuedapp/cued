import { getCurrentUser } from "@/server/auth/session";
import { visibilityService } from "@/server/application/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await visibilityService.getSettings();
  return Response.json(
    { showStatistics: user.role === "admin" || settings.showServerStatisticsToUsers },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
