import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { m3uEditorIntegrationService, tmdbMetadataService } from "@/server/application/services";
import { logger } from "@/lib/logger";
import { isLocale } from "@/i18n/config";

const inputSchema = z.object({
  type: z.enum(["movie", "series"]),
  tmdbId: z.number().int().positive(),
  sourceId: z.string().uuid(),
  locale: z.string().refine(isLocale),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = z
    .object({ type: z.enum(["movie", "series"]), tmdbId: z.coerce.number().int().positive() })
    .safeParse({ type: url.searchParams.get("type"), tmdbId: url.searchParams.get("tmdbId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [sources, pending] = await Promise.all([
    m3uEditorIntegrationService.getSources(user.id, parsed.data.type, parsed.data.tmdbId),
    m3uEditorIntegrationService.getPendingTitles([{ type: parsed.data.type, id: parsed.data.tmdbId }]),
  ]);
  return NextResponse.json({ sources, pending: pending.has(`${parsed.data.type}:${parsed.data.tmdbId}`) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const metadata = await tmdbMetadataService.getTitleMetadata(
      parsed.data.type,
      parsed.data.tmdbId,
      parsed.data.locale,
    );
    const result = await m3uEditorIntegrationService.createStrmRequest(
      user.id,
      parsed.data.type,
      parsed.data.tmdbId,
      parsed.data.sourceId,
      metadata.originalTitle,
    );
    return NextResponse.json({ state: "requested", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPTV request failed";
    logger.error("IPTV STRM request failed", {
      userId: user.id,
      mediaType: parsed.data.type,
      tmdbId: parsed.data.tmdbId,
      error: message,
    });
    return NextResponse.json(
      { error: message },
      { status: message.includes("access") || message.includes("unavailable") ? 403 : 502 },
    );
  }
}
