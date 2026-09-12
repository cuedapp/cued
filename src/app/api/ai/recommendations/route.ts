import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { aiConversationService } from "@/server/application/services";
import { AiConversationError } from "@/server/application/ai-conversation.service";

const schema = z.object({ locale: z.enum(["en", "sv", "nl"]), question: z.string().trim().min(3).max(500) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await aiConversationService.getStatus(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    return NextResponse.json(await aiConversationService.ask(user.id, input.data.locale, input.data.question));
  } catch (error) {
    if (error instanceof AiConversationError) return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
