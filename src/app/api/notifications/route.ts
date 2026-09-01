import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { inAppNotificationService } from "@/server/application/services";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const notifications = await inAppNotificationService.listUnread(user.id);
  return NextResponse.json({ notifications: notifications.map((item) => ({ id: item.id, category: item.category })) });
}
