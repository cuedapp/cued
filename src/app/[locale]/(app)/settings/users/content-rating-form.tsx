"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateUserContentRating, type UserManagementState } from "./actions";
import { contentRatingLimitAges } from "@/lib/content-rating";

export function ContentRatingForm({
  userId,
  locale,
  maximumAge,
}: {
  userId: string;
  locale: string;
  maximumAge: number | null;
}) {
  const t = useTranslations("Users");
  const [state, action] = useActionState(updateUserContentRating, {} as UserManagementState);
  useEffect(() => {
    if (state.result === "content-rating-saved") toast.success(t("contentRatingSaved"));
    if (state.error) toast.error(t("contentRatingFailed"));
  }, [state, t]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-muted/40 p-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <label className="grid min-w-48 flex-1 gap-1.5 text-sm">
        <span className="font-medium">{t("maximumContentRating")}</span>
        <select
          name="maximumAge"
          defaultValue={maximumAge?.toString() ?? ""}
          className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
        >
          <option value="">{t("contentRatingUnrestricted")}</option>
          {contentRatingLimitAges.map((age) => (
            <option key={age} value={age}>
              {age === 0
                ? t("contentRatingAllAges")
                : age === 17
                  ? t("contentRatingHideAdults")
                  : t("contentRatingAge", { age })}
            </option>
          ))}
        </select>
      </label>
      <FormSubmitButton size="sm" pendingLabel={t("savingContentRating")}>
        {t("saveContentRating")}
      </FormSubmitButton>
    </form>
  );
}
