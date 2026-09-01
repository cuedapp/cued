import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { jellyfinIntegrationService } from "@/server/application/services";
import { hasLocalUsers } from "@/server/auth/session";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const locale = await getLocale();
  const t = await getTranslations("Setup");
  const integration = await jellyfinIntegrationService.getOverview();
  if (integration.configured && (await hasLocalUsers())) redirect(`/${locale}/login`);
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-lg place-items-center p-5">
      <div className="w-full space-y-6">
        <Brand />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t("title")}</CardTitle>
            <CardDescription>{t("intro")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SetupForm
              locale={locale}
              encryptionConfigured={integration.encryptionConfigured}
              baseUrl={integration.baseUrl}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
