"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Check, Library, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { contentRatingLimitAges } from "@/lib/content-rating";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/form-submit-button";
import { updateUserPolicies, type UserManagementState } from "./actions";

type Policy = {
  maximumAge: string;
  aiChatEnabled: boolean;
  aiChatDailyLimit: string;
  requestsRequireApproval: boolean;
};

type LibraryAccess = { id: string; name: string; accessible: boolean };

export function UserPolicyForm({
  userId,
  locale,
  maximumAge,
  aiChatEnabled,
  aiChatDailyLimit,
  requestsRequireApproval,
  administrator,
  libraries,
}: {
  userId: string;
  locale: string;
  maximumAge: number | null;
  aiChatEnabled: boolean;
  aiChatDailyLimit: number;
  requestsRequireApproval: boolean;
  administrator: boolean;
  libraries: LibraryAccess[];
}) {
  const t = useTranslations("Users");
  const initial = useMemo<Policy>(
    () => ({
      maximumAge: maximumAge?.toString() ?? "",
      aiChatEnabled,
      aiChatDailyLimit: String(aiChatDailyLimit),
      requestsRequireApproval,
    }),
    [maximumAge, aiChatEnabled, aiChatDailyLimit, requestsRequireApproval],
  );
  const [saved, setSaved] = useState(initial);
  const [policy, setPolicy] = useState(initial);
  const policyRef = useRef(policy);
  const [state, action] = useActionState(updateUserPolicies, {} as UserManagementState);
  const dirty = JSON.stringify(policy) !== JSON.stringify(saved);

  useEffect(() => {
    policyRef.current = policy;
  }, [policy]);

  useEffect(() => {
    if (state.result === "policies-saved") {
      setSaved(policyRef.current);
      toast.success(t("policiesSaved"));
    }
    if (state.error) toast.error(t("managementFailed"));
  }, [state, t]);

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <CardContent className="space-y-5">
        <PolicySection title={t("contentRatingPolicy")} description={t("contentRatingPolicyHelp")}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("maximumContentRating")}</span>
            <select
              name="maximumAge"
              value={policy.maximumAge}
              onChange={(event) => setPolicy((current) => ({ ...current, maximumAge: event.target.value }))}
              className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3 sm:max-w-md"
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
        </PolicySection>

        <PolicySection title={t("aiChatPolicy")} description={t("aiChatPolicyHelp")}>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-end">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="aiChatEnabled"
                checked={policy.aiChatEnabled}
                onChange={(event) => setPolicy((current) => ({ ...current, aiChatEnabled: event.target.checked }))}
                className="size-4 cursor-pointer accent-primary"
              />
              {t("aiChatEnabled")}
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("aiDailyLimit")}</span>
              <Input
                name="aiChatDailyLimit"
                type="number"
                min={1}
                max={100}
                value={policy.aiChatDailyLimit}
                onChange={(event) => setPolicy((current) => ({ ...current, aiChatDailyLimit: event.target.value }))}
              />
            </label>
          </div>
        </PolicySection>

        <PolicySection title={t("requestPolicy")} description={t("requestPolicyHelp")}>
          {administrator ? (
            <>
              {policy.requestsRequireApproval && <input type="hidden" name="requestsRequireApproval" value="on" />}
              <p className="text-sm text-muted-foreground">{t("adminsRequestDirectly")}</p>
            </>
          ) : (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="requestsRequireApproval"
                checked={policy.requestsRequireApproval}
                onChange={(event) =>
                  setPolicy((current) => ({ ...current, requestsRequireApproval: event.target.checked }))
                }
                className="size-4 cursor-pointer accent-primary"
              />
              {t("requireRequestApproval")}
            </label>
          )}
        </PolicySection>

        <section className="space-y-3 border-t border-border/70 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Library className="size-4 text-primary" />
              {t("permissions")}
            </h3>
            {libraries.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("librariesAllowed", {
                  count: libraries.filter((library) => library.accessible).length,
                  total: libraries.length,
                })}
              </span>
            )}
          </div>
          {libraries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noLibraries")}</p>
          ) : (
            <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
              {libraries.map((library) => (
                <div key={library.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">{library.name}</span>
                  <span
                    className={
                      library.accessible
                        ? "flex shrink-0 items-center gap-1 text-emerald-700 dark:text-emerald-400"
                        : "flex shrink-0 items-center gap-1 text-muted-foreground"
                    }
                  >
                    {library.accessible ? <Check className="size-4" /> : <X className="size-4" />}
                    {library.accessible ? t("allowed") : t("denied")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3 border-t border-border/70 pt-5">
        <Button variant="outline" asChild>
          <Link href={`/profile/${userId}` as never}>{t("viewProfile")}</Link>
        </Button>
        <FormSubmitButton disabled={!dirty} pendingLabel={t("savingPolicies")}>
          {t("savePolicies")}
        </FormSubmitButton>
      </CardFooter>
    </form>
  );
}

function PolicySection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border/70 pt-5 first:border-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/40 p-3">{children}</div>
    </section>
  );
}
