import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { AiRecommendationChat } from "@/components/ai-recommendation-chat";
import { getCurrentUser } from "@/server/auth/session";
import { aiConversationService } from "@/server/application/services";

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [status, history] = await Promise.all([
    aiConversationService.getStatus(user.id),
    aiConversationService.getHistory(user.id),
  ]);
  if (!status.enabled) notFound();
  const t = await getTranslations("AiChat");
  return (
    <div className="max-w-4xl space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <AiRecommendationChat initialRemaining={status.remaining} initialHistory={history as never} />
    </div>
  );
}
