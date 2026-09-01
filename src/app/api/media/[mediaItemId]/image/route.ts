import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, libraryService, tasteService } from "@/server/application/services";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ mediaItemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { mediaItemId } = await params;
  const jellyfinItemId =
    (await tasteService.getJellyfinItemId(user.id, mediaItemId)) ??
    (await libraryService.getAccessibleJellyfinItemId(user.id, mediaItemId));
  if (!jellyfinItemId) return new Response(null, { status: 404 });
  const image = await jellyfinIntegrationService.getItemImage(jellyfinItemId);
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
      ...(image.etag ? { ETag: image.etag } : {}),
    },
  });
}
