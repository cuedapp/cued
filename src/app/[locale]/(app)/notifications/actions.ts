"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import { inAppNotificationService } from "@/server/application/services";

export async function clearNotifications() {
  const user = await getCurrentUser();
  if (!user) return;
  await inAppNotificationService.clear(user.id);
  revalidatePath("/notifications", "page");
}
