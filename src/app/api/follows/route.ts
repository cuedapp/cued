import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { followService } from "@/server/application/services";

const schema = z.object({
  targetType: z.enum(["movie", "series", "person"]),
  tmdbId: z.number().int().positive(),
  locale: z.string().refine(isLocale),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await followService.follow(user.id, input.data.targetType, input.data.tmdbId, input.data.locale);
    return NextResponse.json({ following: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Follow failed" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await followService.unfollow(user.id, input.data.targetType, input.data.tmdbId);
  return NextResponse.json({ following: false });
}
