"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppDialog } from "@/components/app-dialog";
import { Button } from "@/components/ui/button";
import { ReviewActions } from "./review-actions";

export function ReapproveDialog({
  id,
  locale,
  type,
  tmdbId,
  title,
  reviewOptions,
}: {
  id: string;
  locale: string;
  type: "movie" | "series";
  tmdbId: number;
  title: string;
  reviewOptions: {
    rootFolders: Array<{ id: number; path: string }>;
    qualityProfiles: Array<{ id: number; name: string }>;
    defaultRootFolderPath?: string;
    defaultProfileId?: number;
  };
}) {
  const t = useTranslations("Requests");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("approveNow")}
      </Button>
      <AppDialog isOpen={open} onOpenChange={setOpen} label={t("approveRejected")} className="max-w-2xl">
        <div className="p-6">
          <h2 className="font-display text-2xl font-semibold">{t("approveRejected")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("approveRejectedHelp")}</p>
          <div className="mt-6">
            <ReviewActions
              id={id}
              locale={locale}
              type={type}
              tmdbId={tmdbId}
              title={title}
              mode="rejected"
              onCancel={() => setOpen(false)}
              {...reviewOptions}
            />
          </div>
        </div>
      </AppDialog>
    </>
  );
}
