"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { userPreferencesService } from "@/server/application/services";

const preferencesSchema = z.object({
  dateFormat: z.enum(["yyyy-mm-dd", "dd-mm-yyyy", "mm-dd-yyyy"]),
  timeFormat: z.enum(["24h", "12h"]),
});

export async function updateDisplayPreferences(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const parsed = preferencesSchema.safeParse({ dateFormat: formData.get("dateFormat"), timeFormat: formData.get("timeFormat") });
  if (!parsed.success) return;
  await userPreferencesService.updateDisplayPreferences(user.id, parsed.data);
  revalidatePath("/settings", "page");
  revalidatePath("/history", "page");
}
