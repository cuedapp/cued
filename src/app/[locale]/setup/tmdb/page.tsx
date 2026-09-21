import { getTranslations } from "next-intl/server";
import { WizardTmdbForm } from "@/components/wizard-forms/wizard-tmdb-form";
import { WizardStepContent } from "@/components/wizard-step-header";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function TmdbStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  const { tmdb } = await setupWizardService.getOverview();
  return (
    <WizardStepContent
      configured={tmdb.configured}
      summary={<p className="text-sm text-muted-foreground">{t("summary.tmdb")}</p>}
    >
      <WizardTmdbForm locale={locale} hasAccessToken={tmdb.hasAccessToken} />
    </WizardStepContent>
  );
}
