import { notFound } from "next/navigation";
import { ArrowLeft, BrainCircuit, CheckCircle2, CircleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { aiIntegrationService } from "@/server/application/services";
import { OpenAiIntegrationForm } from "../openai-integration-form";

export default async function OpenAiIntegrationPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();
  const locale = await getLocale();
  const t = await getTranslations("Integrations");
  const aiT = await getTranslations("OpenAiIntegration");
  const providerT = await getTranslations("AiProviders");
  const usageT = await getTranslations("AiActualUsage");
  const [openai, openrouter] = await Promise.all([
    aiIntegrationService.getOverview("openai"),
    aiIntegrationService.getOverview("openrouter"),
  ]);
  const active =
    openrouter.mode !== "off"
      ? { ...openrouter, provider: "openrouter" as const }
      : { ...openai, provider: "openai" as const };
  const number = new Intl.NumberFormat(locale);
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <Link
          href="/settings/integrations"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("allIntegrations")}
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{providerT("title")}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{providerT("help")}</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="size-5" />
            </div>
            <CardTitle>{t("configuration")}</CardTitle>
            <CardDescription>{providerT("configurationHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <OpenAiIntegrationForm
              locale={locale}
              encryptionConfigured={openai.encryptionConfigured}
              initialProvider={active.provider}
              configurations={{
                openai: {
                  hasApiKey: openai.hasApiKey,
                  mode: openai.mode,
                  model: openai.model,
                  refreshDelayMinutes: openai.refreshDelayMinutes,
                },
                openrouter: {
                  hasApiKey: openrouter.hasApiKey,
                  mode: openrouter.mode,
                  model: openrouter.model,
                  refreshDelayMinutes: openrouter.refreshDelayMinutes,
                },
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{aiT("status")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {active.status === "healthy" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <CircleAlert className="size-5 text-muted-foreground" />
              )}
              <div>
                <div className="font-medium">{active.mode === "off" ? aiT("disabled") : aiT("enabled")}</div>
                <div className="text-sm text-muted-foreground">
                  {providerT(`providers.${active.provider}`)} · {aiT(`modes.${active.mode}`)}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <span className="text-muted-foreground">{aiT("model")}</span>
              <span className="ml-2 font-medium">{active.model}</span>
            </div>
            {active.usage && (
              <div className="rounded-xl bg-muted/60 p-4 text-sm">
                <div className="font-medium">{usageT("title")}</div>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-muted-foreground">{usageT("requests")}</dt>
                    <dd className="font-semibold">{number.format(active.usage.requests)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{usageT("cost")}</dt>
                    <dd className="font-semibold">{currency.format(active.usage.costUsd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{usageT("input")}</dt>
                    <dd className="font-semibold">{number.format(active.usage.inputTokens)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{usageT("output")}</dt>
                    <dd className="font-semibold">{number.format(active.usage.outputTokens)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{usageT("help")}</p>
              </div>
            )}
            {active.lastError && (
              <div className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                <div className="font-medium">{aiT("lastError")}</div>
                <div className="mt-1">{active.lastError}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
