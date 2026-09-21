import { WizardAiForm } from "@/components/wizard-forms/wizard-ai-form";
import { WizardStepContent } from "@/components/wizard-step-header";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function AiStepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const { openai, openrouter } = await setupWizardService.getOverview();
  const configured = openai.configured || openrouter.configured;
  const names = [openai.configured && "OpenAI", openrouter.configured && "OpenRouter"].filter(Boolean).join(", ");
  return (
    <WizardStepContent configured={configured} summary={<p className="text-sm text-muted-foreground">{names}</p>}>
      <WizardAiForm locale={locale} configurations={{ openai, openrouter }} />
    </WizardStepContent>
  );
}
