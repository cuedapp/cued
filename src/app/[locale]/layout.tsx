import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("title"), description: t("description"), applicationName: "Cued", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "Cued" } };
}

export default async function LocaleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextIntlClientProvider><Providers><AppShell>{children}</AppShell></Providers></NextIntlClientProvider>
      </body>
    </html>
  );
}
