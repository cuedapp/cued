import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { bootstrapService } from "@/server/application/services";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!bootstrapService) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const started = await bootstrapService.retry(user.id, user.locale);
  return NextResponse.json({ started }, { status: started ? 202 : 409 });
}
