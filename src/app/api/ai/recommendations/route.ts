import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { aiConversationService } from "@/server/application/services";
import { AiConversationError } from "@/server/application/ai-conversation.service";
import { OpenAiRequestError } from "@/server/integrations/ai/openai-client";
import { OpenRouterRequestError } from "@/server/integrations/ai/openrouter-client";
import { logger } from "@/lib/logger";

const schema = z.object({
  locale: z.enum(["en", "sv", "nl"]),
  question: z.string().trim().min(3).max(500),
  scope: z.enum(["catalogue", "explore"]).default("catalogue"),
});

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
    return NextResponse.json(
      await aiConversationService.ask(user.id, input.data.locale, input.data.question, input.data.scope),
    );
  } catch (error) {
    if (error instanceof AiConversationError) return NextResponse.json({ error: error.code }, { status: error.status });
    const providerError = error instanceof OpenAiRequestError || error instanceof OpenRouterRequestError;
    logger.error("AI conversation request failed", {
      error: providerError ? error.message : error instanceof Error ? error.message : "Unknown error",
    });
    if (providerError) return NextResponse.json({ error: "provider" }, { status: 502 });
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
