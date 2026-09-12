"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateUserAiPolicy, type UserManagementState } from "./actions";

export function AiChatPolicyForm({
  userId,
  locale,
  enabled,
  dailyLimit,
}: {
  userId: string;
  locale: string;
  enabled: boolean;
  dailyLimit: number;
}) {
  const t = useTranslations("Users");
  const [state, action] = useActionState(updateUserAiPolicy, {} as UserManagementState);
  useEffect(() => {
    if (state.result) toast.success(t("aiPolicySaved"));
    if (state.error) toast.error(t("managementFailed"));
  }, [state, t]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4 accent-primary" />
        {t("aiChatEnabled")}
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{t("aiDailyLimit")}</span>
        <Input name="dailyLimit" type="number" min={1} max={100} defaultValue={dailyLimit} className="max-w-28" />
      </label>
      <FormSubmitButton size="sm" variant="outline" pendingLabel={t("savingAccess")}>
        {t("saveAiPolicy")}
      </FormSubmitButton>
    </form>
  );
}
