import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import { tasteService } from "@/server/application/services";
import { completeTasteOnboarding } from "../history/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  const t = await getTranslations("Onboarding");
  if (!user) return null;
  const onboarding = await tasteService.getOnboarding(user.id);
  if (onboarding?.onboardingStatus !== "pending") return <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center"><Sparkles className="mx-auto size-8 text-primary" /><h1 className="mt-4 font-display text-3xl font-semibold">{t("completeTitle")}</h1><p className="mt-3 text-muted-foreground">{t("completeBody")}</p></div>;
  return <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-10"><Sparkles className="size-9 text-primary" /><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-5 leading-7 text-muted-foreground">{t("intro")}</p><div className="mt-8 rounded-2xl bg-muted/60 p-5 text-sm leading-6 text-muted-foreground">{t("historyHelp")}</div><form action={completeTasteOnboarding} className="mt-8 flex flex-wrap gap-3"><FormSubmitButton name="status" value="completed" className="cursor-pointer" pendingLabel={t("starting")}>{t("start")}</FormSubmitButton><FormSubmitButton name="status" value="skipped" variant="outline" className="cursor-pointer" pendingLabel={t("skipping")}>{t("skip")}</FormSubmitButton></form></div>;
}
