"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";

const feedbackSchema = z.object({
  recommendationId: z.string().uuid(),
  feedback: z.enum(["moreLikeThis", "notInterested", "restore"]),
});

export async function updateRecommendationFeedback(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = feedbackSchema.safeParse({ recommendationId: formData.get("recommendationId"), feedback: formData.get("feedback") });
  if (!user || !parsed.success) return;
  await recommendationService.setFeedback(user.id, parsed.data.recommendationId, parsed.data.feedback === "restore" ? null : parsed.data.feedback);
  await recommendationService.invalidate(user.id);
  revalidatePath("/", "page");
}
