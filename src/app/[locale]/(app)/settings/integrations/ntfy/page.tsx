import { notFound } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { notificationService } from "@/server/application/services";
import { NtfyForm } from "../ntfy-form";

export default async function NtfyPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const [locale, t, n, overview] = await Promise.all([
    getLocale(),
    getTranslations("Integrations"),
    getTranslations("NtfyIntegration"),
    notificationService.getNtfyOverview(),
  ]);
  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("allIntegrations")}
        </Link>
        <PageIntro eyebrow={t("eyebrow")} title={n("title")} description={n("help")} />
      </div>
      <Card className="flex flex-col">
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" />
          </div>
          <CardTitle>{t("configuration")}</CardTitle>
          <CardDescription>{n("configurationHelp")}</CardDescription>
        </CardHeader>
        <NtfyForm locale={locale} overview={overview} />
      </Card>
    </div>
  );
}
