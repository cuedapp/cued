import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService } from "@/server/application/services";
import { tmdbMetadataService } from "@/server/application/services";

const requestSchema = z.object({
  type: z.enum(["movie", "series"]),
  tmdbId: z.number().int().positive(),
  rootFolderPath: z.string().min(1).max(500).optional(),
  qualityProfileId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = requestSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const title = await tmdbMetadataService
      .getTitleMetadata(input.data.type, input.data.tmdbId, user.locale)
      .then((metadata) => metadata.originalTitle)
      .catch(() => undefined);
    return NextResponse.json(
      await acquisitionService.request(
        user,
        input.data.type,
        input.data.tmdbId,
        {
          rootFolderPath: input.data.rootFolderPath,
          qualityProfileId: input.data.qualityProfileId,
        },
        title,
      ),
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const input = z
    .object({ type: z.enum(["movie", "series"]), tmdbId: z.coerce.number().int().positive() })
    .safeParse({ type: url.searchParams.get("type"), tmdbId: url.searchParams.get("tmdbId") });
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const pending = await acquisitionService
    .getPending()
    .then((requests) =>
      requests.find(
        ({ request: pendingRequest }) =>
          pendingRequest.mediaType === input.data.type && pendingRequest.tmdbId === input.data.tmdbId,
      ),
    );
  return NextResponse.json({
    pending: Boolean(pending),
    canCancelPending: Boolean(pending && pending.request.userId === user.id),
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const input = z
    .object({ type: z.enum(["movie", "series"]), tmdbId: z.coerce.number().int().positive() })
    .safeParse({ type: url.searchParams.get("type"), tmdbId: url.searchParams.get("tmdbId") });
  if (!input.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const removed = await acquisitionService.cancelPending(user, input.data.type, input.data.tmdbId);
    return NextResponse.json({ removed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request removal failed" },
      { status: 403 },
    );
  }
}
