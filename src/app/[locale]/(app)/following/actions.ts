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

export async function hideDerivedUpcoming(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const locale = z.string().refine(isLocale).parse(formData.get("locale"));
  const type = z.enum(["movie", "series"]).parse(formData.get("type"));
  const tmdbId = z.coerce.number().int().positive().parse(formData.get("tmdbId"));
  const followIds = z.array(z.string().uuid()).parse(JSON.parse(z.string().parse(formData.get("followIds"))));
  await followService.hideDerivedUpcoming(user.id, followIds, type, tmdbId);
  revalidatePath(`/${locale}/following`);
}
