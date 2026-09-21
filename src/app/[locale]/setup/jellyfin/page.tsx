import { WizardJellyfinForm } from "@/components/wizard-forms/wizard-jellyfin-form";
import { WizardLibrarySelectionForm } from "@/components/wizard-forms/wizard-library-selection-form";
import { WizardStepContent } from "@/components/wizard-step-header";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function JellyfinStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const { jellyfin } = await setupWizardService.getOverview();

  return (
    <div className="space-y-6">
      <WizardStepContent configured={false} summary={null}>
        <WizardJellyfinForm
          locale={locale}
          baseUrl={jellyfin.baseUrl}
          externalUrl={jellyfin.externalUrl}
          hasApiKey={jellyfin.hasApiKey}
        />
      </WizardStepContent>
      {jellyfin.configured ? (
        <WizardStepContent configured={false} summary={null}>
          <WizardLibrarySelectionForm
            locale={locale}
            libraries={jellyfin.libraries}
            syncIntervalMinutes={jellyfin.syncIntervalMinutes || 1440}
          />
        </WizardStepContent>
      ) : null}
    </div>
  );
}
