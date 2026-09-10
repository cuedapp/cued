"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormSubmitButton } from "@/components/form-submit-button";
import { syncM3uEditor, type M3uSyncFormState } from "./actions";

export function M3uAvailabilitySyncForm({ locale, disabled }: { locale: string; disabled: boolean }) {
  const t = useTranslations("M3uEditorIntegration");
  const router = useRouter();
  const [state, action, isPending] = useActionState(syncM3uEditor, {} as M3uSyncFormState);
  const handledResult = useRef(false);

  useEffect(() => {
    if (isPending) handledResult.current = false;
  }, [isPending]);

  useEffect(() => {
    if (isPending || handledResult.current) return;
    if (!state.started && !state.error) return;
    handledResult.current = true;
    router.refresh();
  }, [isPending, router, state.error, state.started]);

  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <FormSubmitButton disabled={disabled} pendingLabel={t("syncing")}>
        {t("sync")}
      </FormSubmitButton>
    </form>
  );
}
