import { NextResponse } from "next/server";
import { visibilityService, watchingNowService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const visibility = await visibilityService.getSettings();
  const items = await watchingNowService.getForViewer(user, visibility.showWatchingNowToUsers);
  return NextResponse.json({
    items,
    canSeeEveryone: user.role === "admin" || visibility.showWatchingNowToUsers,
  });
}
