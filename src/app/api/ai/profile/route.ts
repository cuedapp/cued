import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";
import { OpenAiRequestError } from "@/server/integrations/ai/openai-client";
import { logger } from "@/lib/logger";

const schema = z.object({ locale: z.enum(["en", "sv", "nl"]) });
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    await recommendationService.refreshAiProfile(user.id, parsed.data.locale);
    await recommendationService.startRefresh(user.id, parsed.data.locale, true);
    return NextResponse.json({ started: true }, { status: 202 });
  } catch (error) {
    const detail = error instanceof OpenAiRequestError ? error.message : undefined;
    logger.error("AI profile refresh failed", {
      error: detail ?? (error instanceof Error ? error.message : "Unknown error"),
    });
    return NextResponse.json({ error: "unavailable", ...(detail ? { detail } : {}) }, { status: 503 });
  }
}
