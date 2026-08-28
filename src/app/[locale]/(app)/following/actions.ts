"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/session";
import { followService } from "@/server/application/services";

export async function refreshFollows(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const locale = z.string().refine(isLocale).parse(formData.get("locale"));
  await followService.refreshUser(user.id, locale);
  revalidatePath(`/${locale}/following`);
}
