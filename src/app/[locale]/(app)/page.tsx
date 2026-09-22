import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { getCurrentUser } from "@/server/auth/session";
import { visibilityService } from "@/server/application/services";
import {
  DashboardActivity,
  DashboardRecommendations,
  DashboardSectionLoading,
  DashboardWatchingNow,
} from "./dashboard-sections";

export default async function Dashboard() {
  const [t, user] = await Promise.all([getTranslations("Dashboard"), getCurrentUser()]);
  const visibility = visibilityService.getSettings();
  return (
    <div className="min-w-0 max-w-full space-y-8">
      <section className="relative max-w-4xl overflow-hidden rounded-4xl border border-border/60 bg-card px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-40 w-64 rotate-[-8deg] rounded-t-[5rem] border border-primary/15 bg-linear-to-t from-primary/12 to-transparent sm:block" />
        <div className="relative max-w-xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="size-4" />
            {t("eyebrow")}
          </div>
          <h1 className="max-w-xl font-display text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">
            <DashboardGreeting />
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{t("intro")}</p>
        </div>
      </section>

      {user ? (
        <>
          <Suspense fallback={<DashboardSectionLoading />}>
            <DashboardWatchingNow user={user} visibility={visibility} />
          </Suspense>
          <Suspense fallback={<DashboardSectionLoading cards={2} />}>
            <DashboardRecommendations user={user} />
          </Suspense>
          <Suspense fallback={<DashboardSectionLoading cards={2} />}>
            <DashboardActivity user={user} visibility={visibility} />
          </Suspense>
        </>
      ) : null}
    </div>
  );
}
