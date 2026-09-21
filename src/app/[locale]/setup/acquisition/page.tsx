import { WizardArrForm } from "@/components/wizard-forms/wizard-arr-form";
import { WizardM3uEditorForm } from "@/components/wizard-forms/wizard-m3u-editor-form";
import { WizardStepContent } from "@/components/wizard-step-header";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function AcquisitionStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const { radarr, sonarr, m3uEditor } = await setupWizardService.getOverview();
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-xl font-semibold">Radarr</h2>
        <WizardStepContent
          configured={radarr.configured}
          summary={<p className="text-sm text-muted-foreground">{radarr.serverName ?? radarr.baseUrl}</p>}
        >
          <WizardArrForm provider="radarr" locale={locale} overview={radarr} />
        </WizardStepContent>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Sonarr</h2>
        <WizardStepContent
          configured={sonarr.configured}
          summary={<p className="text-sm text-muted-foreground">{sonarr.serverName ?? sonarr.baseUrl}</p>}
        >
          <WizardArrForm provider="sonarr" locale={locale} overview={sonarr} />
        </WizardStepContent>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">M3U Editor</h2>
        <WizardStepContent
          configured={m3uEditor.configured}
          summary={<p className="text-sm text-muted-foreground">{m3uEditor.baseUrl}</p>}
        >
          <WizardM3uEditorForm
            locale={locale}
            overview={{
              ...m3uEditor,
              libraries: m3uEditor.libraries.map((library) => ({
                ...library,
                collectionType: library.collectionType ?? null,
              })),
            }}
          />
        </WizardStepContent>
      </section>
    </div>
  );
}
