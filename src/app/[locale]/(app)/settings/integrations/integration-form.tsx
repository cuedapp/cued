"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateJellyfinConfiguration, type IntegrationFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: IntegrationFormState = {};

export function IntegrationForm({ locale, baseUrl, encryptionConfigured, hasApiKey }: { locale: string; baseUrl: string; encryptionConfigured: boolean; hasApiKey: boolean }) {
  const t = useTranslations("Integrations");
  const [state, action] = useActionState(updateJellyfinConfiguration, initialState);
  useEffect(() => {
    if (state.error) toast.error(t(`errors.${state.error}`));
    if (state.result) toast.success(t(`results.${state.result}`));
  }, [state, t]);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="locale" value={locale} />
    <div className="space-y-2"><Label htmlFor="baseUrl">{t("url")}</Label><Input id="baseUrl" name="baseUrl" type="url" defaultValue={baseUrl} required autoComplete="url" /></div>
    <div className="space-y-2"><Label htmlFor="apiKey">{t("apiKey")}</Label><Input id="apiKey" name="apiKey" type="password" placeholder={hasApiKey ? t("keyStored") : undefined} disabled={!encryptionConfigured} autoComplete="off" /><p className="text-xs leading-5 text-muted-foreground">{encryptionConfigured ? t("apiKeyHelp") : t("encryptionHelp")}</p></div>
    <div className="flex flex-wrap gap-3">
      <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")}>{t("save")}</FormSubmitButton>
      <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")}>{t("test")}</FormSubmitButton>
    </div>
  </form>;
}
