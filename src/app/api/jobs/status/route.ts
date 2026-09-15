import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { appStatusService } from "@/server/application/services";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ jobs: (await appStatusService.getForUser(user)).jobs });
}
