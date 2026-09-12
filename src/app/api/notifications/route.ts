import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { inAppNotificationService } from "@/server/application/services";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const notifications =
    new URL(request.url).searchParams.get("scope") === "recent"
      ? (await inAppNotificationService.list(user.id)).slice(0, 20)
      : await inAppNotificationService.listUnread(user.id);
  return NextResponse.json({
    notifications: notifications.map((item) => ({
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

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await inAppNotificationService.markAllRead(user.id);
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => undefined)) as { id?: unknown } | undefined;
  if (!body || typeof body.id !== "string")
    return NextResponse.json({ error: "invalid notification" }, { status: 400 });
  await inAppNotificationService.markRead(user.id, body.id);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await inAppNotificationService.clear(user.id);
  return new NextResponse(null, { status: 204 });
}
