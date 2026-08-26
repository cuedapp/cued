import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import { routing } from "@/i18n/routing";
import { isTheme, themeCookieName } from "@/lib/theme";
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
  const storedTheme = (await cookies()).get(themeCookieName)?.value;
  const theme = isTheme(storedTheme) ? storedTheme : "system";
  return (
    <html lang={locale} className={theme === "system" ? undefined : theme} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextIntlClientProvider><Providers initialTheme={theme}><AppShell>{children}</AppShell></Providers></NextIntlClientProvider>
      </body>
    </html>
  );
}
