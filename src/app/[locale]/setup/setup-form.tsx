"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { configureJellyfin, type SetupFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SetupFormState = {};

export function SetupForm({
  locale,
  encryptionConfigured,
  baseUrl,
}: {
  locale: string;
  encryptionConfigured: boolean;
  baseUrl?: string;
}) {
  const t = useTranslations("Setup");
  const [state, action] = useActionState(configureJellyfin, initialState);
  useEffect(() => {
    if (state.error) toast.error(t(`errors.${state.error}`));
  }, [state, t]);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-2">
        <Label htmlFor="baseUrl">{t("url")}</Label>
        <Input
          id="baseUrl"
          name="baseUrl"
          type="url"
          defaultValue={baseUrl}
          placeholder="http://192.168.0.10:8096"
          required
          autoComplete="url"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("apiKey")}</Label>
        <Input id="apiKey" name="apiKey" type="password" disabled={!encryptionConfigured} autoComplete="off" />
        <p className="text-xs leading-5 text-muted-foreground">
          {encryptionConfigured ? t("apiKeyHelp") : t("encryptionHelp")}
        </p>
      </div>
      <FormSubmitButton className="w-full" pendingLabel={t("connecting")}>
        {t("continue")}
      </FormSubmitButton>
    </form>
  );
}
