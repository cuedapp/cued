import { FormSubmitButton } from "@/components/form-submit-button";
import { CardContent, CardFooter } from "@/components/ui/card";
import type { OriginalLanguageCode } from "@/lib/original-languages";
import { updatePreferredOriginalLanguages } from "./actions";

export function PreferredLanguagesForm({
  languages,
  selected,
  labels,
}: {
  languages: Array<{ code: OriginalLanguageCode; name: string }>;
  selected: string[];
  labels: { help: string; save: string; saving: string };
}) {
  return (
    <form action={updatePreferredOriginalLanguages} className="flex flex-1 flex-col">
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">{labels.help}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {languages.map((language) => (
            <label
              key={language.code}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <input
                type="checkbox"
                name="language"
                value={language.code}
                defaultChecked={selected.includes(language.code)}
                className="size-4 accent-primary"
              />
              {language.name}
            </label>
          ))}
        </div>
      </CardContent>
      <CardFooter className="mt-auto justify-end">
        <FormSubmitButton pendingLabel={labels.saving}>{labels.save}</FormSubmitButton>
      </CardFooter>
    </form>
  );
}
