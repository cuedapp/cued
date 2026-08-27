import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RecommendationBrowser } from "@/components/recommendation-browser";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";

export default async function RecommendationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("Recommendations");
  const recommendations = await recommendationService.getAll(user.id);
  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p></header><RecommendationBrowser items={recommendations} /></div>;
}
