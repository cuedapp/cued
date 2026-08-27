import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";

const requestSchema = z.object({ locale: z.enum(["en", "sv", "nl"]), force: z.boolean().optional() });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await recommendationService.getStatus(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const started = await recommendationService.startRefresh(user.id, parsed.data.locale, parsed.data.force ?? false);
  return NextResponse.json({ started }, { status: started ? 202 : 200 });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await recommendationService.clear(user.id);
  return new NextResponse(null, { status: 204 });
}
