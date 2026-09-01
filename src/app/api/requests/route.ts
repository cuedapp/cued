import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService } from "@/server/application/services";

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
    return NextResponse.json(
      await acquisitionService.request(user, input.data.type, input.data.tmdbId, {
        rootFolderPath: input.data.rootFolderPath,
        qualityProfileId: input.data.qualityProfileId,
      }),
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 502 });
  }
}
