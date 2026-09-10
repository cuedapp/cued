"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale } from "@/i18n/config";
import { acquisitionService, userDirectoryService } from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";

export interface UserRequestPolicyState {
  result?: "saved";
  error?: "failed";
}

export interface UserManagementState {
  result?: "access-saved" | "order-saved";
  error?: "failed";
}

export async function updateUserAccess(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({ userId: z.string().uuid(), locale: z.string().refine(isLocale), accessEnabled: z.boolean() })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      accessEnabled: formData.get("accessEnabled") === "true",
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.setAccessEnabled(admin.id, input.data.userId, input.data.accessEnabled);
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/statistics`);
    return { result: "access-saved" };
  } catch {
    return { error: "failed" };
  }
}

export async function reorderUsers(_: UserManagementState, formData: FormData): Promise<UserManagementState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  let userIds: unknown = [];
  try {
    userIds = JSON.parse(String(formData.get("userIds") ?? "[]"));
  } catch {
    return { error: "failed" };
  }
  const input = z
    .object({
      locale: z.string().refine(isLocale),
      userIds: z.array(z.string().uuid()),
    })
    .safeParse({
      locale: formData.get("locale"),
      userIds,
    });
  if (!input.success) return { error: "failed" };
  try {
    await userDirectoryService.reorderUsers(input.data.userIds);
    revalidatePath(`/${input.data.locale}/settings/users`);
    revalidatePath(`/${input.data.locale}/statistics`);
    return { result: "order-saved" };
  } catch {
    return { error: "failed" };
  }
}
export async function updateUserRequestPolicy(
  _: UserRequestPolicyState,
  formData: FormData,
): Promise<UserRequestPolicyState> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") throw new Error("Administrator access required");
  const input = z
    .object({ userId: z.string().uuid(), locale: z.string().refine(isLocale), requireApproval: z.boolean() })
    .safeParse({
      userId: formData.get("userId"),
      locale: formData.get("locale"),
      requireApproval: formData.get("requireApproval") === "on",
    });
  if (!input.success) return { error: "failed" };
  try {
    await acquisitionService.setUserApprovalPolicy(input.data.userId, input.data.requireApproval);
    revalidatePath(`/${input.data.locale}/settings/users`);
    return { result: "saved" };
  } catch {
    return { error: "failed" };
  }
}
