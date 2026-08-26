import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService } from "@/server/application/services";
import { authRepository } from "@/server/db/repositories/auth.repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new Response(null, { status: 401 });
  const { userId } = await params;
  if (currentUser.id !== userId && currentUser.role !== "admin") return new Response(null, { status: 403 });

  const user = await authRepository.getUserById(userId);
  if (!user?.primaryImageTag) return new Response(null, { status: 404 });
  const image = await jellyfinIntegrationService.getUserAvatar(user.jellyfinUserId, user.primaryImageTag);
  if (!image) return new Response(null, { status: 404 });

  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
      ...(image.etag ? { ETag: image.etag } : {}),
    },
  });
}
