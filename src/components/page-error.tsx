"use client";

import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PageError({ retry }: { retry: () => void }) {
  const t = useTranslations("Common");
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <CircleAlert aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{t("errorTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("errorBody")}</p>
        <Button className="mt-5" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
