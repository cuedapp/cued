"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateSelectedLibraries, type LibraryFormState } from "./actions";

const initialState: LibraryFormState = {};

export function LibrarySelectionForm({
  locale,
  libraries,
}: {
  locale: string;
  libraries: Array<{ id: string; name: string; collectionType?: string; selected: boolean }>;
}) {
  const t = useTranslations("Integrations");
  const [state, action] = useActionState(updateSelectedLibraries, initialState);
  useEffect(() => {
    if (state.error) toast.error(t("libraryErrors.failed"));
    if (state.result) toast.success(t("libraryResults.saved"));
  }, [state, t]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-3 sm:grid-cols-2">
        {libraries.map((library) => (
          <label key={library.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              name="selected"
              value={library.id}
              defaultChecked={library.selected}
              className="size-4 accent-primary"
            />
            <span>
              <span className="block font-medium">{library.name}</span>
              {library.collectionType && (
                <span className="block text-xs text-muted-foreground">{library.collectionType}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="-mx-6 -mb-6 mt-6 flex justify-end border-t border-border/70 px-6 py-4">
        <FormSubmitButton pendingLabel={t("saving")}>{t("saveLibraries")}</FormSubmitButton>
      </div>
    </form>
  );
}
