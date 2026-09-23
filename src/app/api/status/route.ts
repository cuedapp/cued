import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { appStatusService } from "@/server/application/services";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = await appStatusService.getForUser(user);
  return NextResponse.json({
    ...status,
    notifications: status.notifications.map((item) => ({
      id: item.id,
      category: item.category,
      message: item.message,
      details: item.details,
      href: item.href,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
    })),
  });
}
