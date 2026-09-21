import { WizardNtfyForm } from "@/components/wizard-forms/wizard-ntfy-form";
import { WizardStepContent } from "@/components/wizard-step-header";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function NotificationsStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const { ntfy } = await setupWizardService.getOverview();
  return (
    <WizardStepContent
      configured={ntfy.configured}
      summary={
        <p className="text-sm text-muted-foreground">
          {ntfy.baseUrl} / {ntfy.topic}
        </p>
      }
    >
      <WizardNtfyForm locale={locale} overview={ntfy} />
    </WizardStepContent>
  );
}
