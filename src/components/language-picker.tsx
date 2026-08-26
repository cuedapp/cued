"use client";

import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguagePicker() {
  const locale = useLocale();
  const t = useTranslations("Languages");
  const router = useRouter();
  const pathname = usePathname();
  return <div className="space-y-2">{locales.map((item) => <button key={item} onClick={() => router.replace(pathname, { locale: item as Locale })} className={cn("flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent", item === locale && "border-primary/40 bg-primary/8")}><Languages className="size-4 text-muted-foreground" /><span className="flex-1">{t(item)}</span>{item === locale && <Check className="size-4 text-primary" />}</button>)}</div>;
}
