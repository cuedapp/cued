"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { login, type LoginFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginFormState = {};

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Login");
  const [state, action] = useActionState(login, initialState);
  useEffect(() => {
    if (state.error) toast.error(t(`errors.${state.error}`));
  }, [state, t]);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="locale" value={locale} />
    <div className="space-y-2"><Label htmlFor="username">{t("username")}</Label><Input id="username" name="username" required autoComplete="username" /></div>
    <div className="space-y-2"><Label htmlFor="password">{t("password")}</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
    <FormSubmitButton className="w-full" pendingLabel={t("signingIn")}>{t("signIn")}</FormSubmitButton>
  </form>;
}
