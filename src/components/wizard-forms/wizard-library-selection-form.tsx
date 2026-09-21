"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateSelectedLibrariesWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { useDirtyRef } from "@/components/setup-wizard-shell";

export function WizardLibrarySelectionForm({
  locale,
  libraries,
  syncIntervalMinutes,
}: {
  locale: string;
  libraries: Array<{ id: string; name: string; collectionType?: string; selected: boolean }>;
  syncIntervalMinutes: number;
}) {
  const t = useTranslations("Integrations");
  const wizardT = useTranslations("Wizard");
  const { markDirty, clearDirty, navigate, recordLibraries } = useDirtyRef();
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateSelectedLibrariesWizard(previous, formData);
    if (result.ok) {
      recordLibraries();
      clearDirty();
      navigate(`/${locale}/setup/tmdb`);
    }
    return result;
  }, {} as WizardFormState);

  return (
    <form action={action} onChange={markDirty} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm text-muted-foreground">{wizardT("form.selectLibraries")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {libraries.map((library) => (
          <label
            key={library.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4"
          >
            <input
              type="checkbox"
              name="selected"
              value={library.id}
              defaultChecked={library.selected}
              className="size-4 accent-primary"
            />
            <span>
              <span className="block font-medium">{library.name}</span>
              {library.collectionType ? (
                <span className="block text-xs text-muted-foreground">{library.collectionType}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <label className="grid max-w-md gap-2 text-sm font-medium">
        {t("scheduleInterval")}
        <select
          name="syncIntervalMinutes"
          defaultValue={syncIntervalMinutes}
          className="h-10 rounded-lg border border-input bg-background px-3"
        >
          <option value="0">{t("scheduleOptions.off")}</option>
          <option value="60">{t("scheduleOptions.60")}</option>
          <option value="360">{t("scheduleOptions.360")}</option>
          <option value="720">{t("scheduleOptions.720")}</option>
          <option value="1440">{t("scheduleOptions.1440")}</option>
        </select>
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("libraryErrors.failed")}
        </p>
      ) : null}
    </form>
  );
}
