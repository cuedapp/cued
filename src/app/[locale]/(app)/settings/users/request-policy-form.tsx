"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateUserRequestPolicy, type UserRequestPolicyState } from "./actions";

export function RequestPolicyForm({ userId, locale, requireApproval, disabled }: { userId: string; locale: string; requireApproval: boolean; disabled: boolean }) {
  const t = useTranslations("Users");
  const [state, action] = useActionState(updateUserRequestPolicy, {} as UserRequestPolicyState);
  useEffect(() => { if (state.result) toast.success(t("requestPolicySaved")); if (state.error) toast.error(t("requestPolicyFailed")); }, [state, t]);
  if (disabled) return <p className="text-sm text-muted-foreground">{t("adminsRequestDirectly")}</p>;
  return <form action={action} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-3"><input type="hidden" name="userId" value={userId} /><input type="hidden" name="locale" value={locale} /><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name="requireApproval" defaultChecked={requireApproval} className="size-4 cursor-pointer accent-primary" />{t("requireRequestApproval")}</label><FormSubmitButton size="sm" pendingLabel={t("savingRequestPolicy")}>{t("saveRequestPolicy")}</FormSubmitButton></form>;
}
