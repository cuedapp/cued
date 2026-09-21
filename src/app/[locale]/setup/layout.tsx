import { getTranslations } from "next-intl/server";
import { WizardShell } from "@/components/setup-wizard-shell";
import { isSetupWizardEncryptionConfigured, setupWizardService } from "@/server/application/setup-wizard.service";

export default async function SetupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  if (!isSetupWizardEncryptionConfigured()) {
    return (
      <main className="grid min-h-dvh place-items-center p-5">
        <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-destructive">{t("encryption.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("encryption.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("encryption.description")}</p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm">
            <li>{t("encryption.generate")}</li>
            <li>{t("encryption.add")}</li>
            <li>{t("encryption.restart")}</li>
          </ol>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-muted p-4 text-sm">
            <code>CUED_ENCRYPTION_KEY=&lt;base64-encoded-32-byte-key&gt;</code>
          </pre>
        </section>
      </main>
    );
  }
  const overview = await setupWizardService.getOverview();
  return (
    <WizardShell locale={locale} snapshot={overview.snapshot}>
      {children}
    </WizardShell>
  );
}
