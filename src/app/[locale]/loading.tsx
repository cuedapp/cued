"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Nav");
  return (
    <div role="status" aria-busy="true" className="grid min-h-dvh place-items-center bg-background">
      <span className="sr-only">{t("loadingPage")}</span>
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
    </div>
  );
}
