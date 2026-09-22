import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { getCurrentUser } from "@/server/auth/session";
import { visibilityService } from "@/server/application/services";
import { ServerStatisticsSection, StatisticsSectionLoading, UserStatisticsSection } from "./statistics-sections";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (!user) notFound();
  const visibility = await visibilityService.getSettings();
  if (user.role !== "admin" && !visibility.showServerStatisticsToUsers) notFound();
  const t = await getTranslations("Statistics");
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Suspense fallback={<StatisticsSectionLoading cards={3} />}>
        <ServerStatisticsSection />
      </Suspense>
      {user.role === "admin" ? (
        <Suspense fallback={<StatisticsSectionLoading cards={2} />}>
          <UserStatisticsSection user={user} selectedUser={params.user} />
        </Suspense>
      ) : null}
    </div>
  );
}
