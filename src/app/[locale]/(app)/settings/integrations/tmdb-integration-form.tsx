"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateTmdbConfiguration, type TmdbFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TmdbFormState = {};

export function TmdbIntegrationForm({ locale, encryptionConfigured, hasAccessToken }: { locale: string; encryptionConfigured: boolean; hasAccessToken: boolean }) {
  const t = useTranslations("TmdbIntegration");
  const [state, action] = useActionState(updateTmdbConfiguration, initialState);
  const [accessToken, setAccessToken] = useState("");
  useEffect(() => {
    if (state.error) toast.error(t(`errors.${state.error}`));
    if (state.result) toast.success(t(`results.${state.result}`));
  }, [state, t]);
  return <form action={action} onReset={(event) => event.preventDefault()} className="space-y-5">
    <input type="hidden" name="locale" value={locale} />
    <div className="space-y-2">
      <Label htmlFor="tmdbAccessToken">{t("accessToken")}</Label>
      <Input id="tmdbAccessToken" name="accessToken" type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder={hasAccessToken ? t("tokenStored") : undefined} disabled={!encryptionConfigured} autoComplete="off" />
      <p className="text-xs leading-5 text-muted-foreground">{encryptionConfigured ? t("accessTokenHelp") : t("encryptionHelp")}</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")}>{t("save")}</FormSubmitButton>
      <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")} disabled={!hasAccessToken && !accessToken}>{t("test")}</FormSubmitButton>
    </div>
  </form>;
}
