"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("errorTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("errorBody")}</p>
        <Button className="mt-5" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
