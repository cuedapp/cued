import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService, visibilityService } from "@/server/application/services";
import { authRepository } from "@/server/db/repositories/auth.repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new Response(null, { status: 401 });
  const { userId } = await params;
  const user = await authRepository.getUserById(userId);
  const viewingAnotherUser = currentUser.id !== userId && currentUser.role !== "admin";
  if (viewingAnotherUser) {
    const visibility = await visibilityService.getSettings();
    if (!visibility.showRecentActivityToUsers || !user || user.disabled || !user.accessEnabled) {
      return new Response(null, { status: 403 });
    }
  }
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
