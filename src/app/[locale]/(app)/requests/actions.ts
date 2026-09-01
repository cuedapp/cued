"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { acquisitionService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";

export interface ReviewRequestState {
  result?: "approved" | "rejected";
  error?: "failed";
}
export async function reviewAcquisitionRequest(_: ReviewRequestState, formData: FormData): Promise<ReviewRequestState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({
      id: z.string().uuid(),
      locale: z.string().refine(isLocale),
      decision: z.enum(["approved", "rejected"]),
      rootFolderPath: z.string().optional(),
      qualityProfileId: z.coerce.number().int().positive().optional(),
    })
    .safeParse({
      id: formData.get("id"),
      locale: formData.get("locale"),
      decision: formData.get("decision"),
      rootFolderPath: formData.get("rootFolderPath") || undefined,
      qualityProfileId: formData.get("qualityProfileId") || undefined,
    });
  if (!input.success) return { error: "failed" };
  try {
    if (input.data.decision === "approved") {
      if (!input.data.rootFolderPath || !input.data.qualityProfileId) return { error: "failed" };
      await acquisitionService.approve(input.data.id, user.id, {
        rootFolderPath: input.data.rootFolderPath,
        qualityProfileId: input.data.qualityProfileId,
      });
    } else await acquisitionService.reject(input.data.id, user.id);
    revalidatePath(`/${input.data.locale}/requests`);
    return { result: input.data.decision };
  } catch {
    return { error: "failed" };
  }
}
