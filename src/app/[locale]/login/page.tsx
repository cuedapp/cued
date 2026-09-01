import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { jellyfinIntegrationService } from "@/server/application/services";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = await getTranslations("Login");
  const integration = await jellyfinIntegrationService.getOverview();
  if (!integration.configured) redirect(`/${locale}/setup`);
  if (await getCurrentUser()) redirect(`/${locale}`);
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md place-items-center p-5">
      <div className="w-full space-y-6">
        <Brand />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t("title")}</CardTitle>
            <CardDescription>{t("intro", { server: integration.serverName ?? "Jellyfin" })}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm locale={locale} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
