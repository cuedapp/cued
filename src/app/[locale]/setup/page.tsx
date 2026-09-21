import { redirect } from "next/navigation";
import { getFirstIncompleteSetupWizardStep } from "@/lib/setup-wizard";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function SetupRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSetupWizardEncryptionConfigured()) return null;
  const overview = await setupWizardService.getOverview();
  redirect(`/${locale}/setup/${getFirstIncompleteSetupWizardStep(overview.snapshot)}`);
}
