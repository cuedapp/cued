"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { acquisitionService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";

export interface UserRequestPolicyState { result?: "saved"; error?: "failed" }
export async function updateUserRequestPolicy(_: UserRequestPolicyState, formData: FormData): Promise<UserRequestPolicyState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z.object({ userId: z.string().uuid(), locale: z.string().refine(isLocale), requireApproval: z.boolean() }).safeParse({ userId: formData.get("userId"), locale: formData.get("locale"), requireApproval: formData.get("requireApproval") === "on" });
  if (!input.success) return { error: "failed" };
  try { await acquisitionService.setUserApprovalPolicy(input.data.userId, input.data.requireApproval); revalidatePath(`/${input.data.locale}/settings/users`); return { result: "saved" }; } catch { return { error: "failed" }; }
}
