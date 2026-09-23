"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";
import { Link } from "@/i18n/navigation";
import { useAppStatus } from "./app-status-provider";

export function JobIndicator() {
  const t = useTranslations("JobIndicator");
  const { status } = useAppStatus();
  const jobs = status?.jobs ?? [];
  const [open, setOpen] = useState(false);

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <Button
        className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("label")}
      >
        {jobs.length ? (
          <LoaderCircle className="size-5 animate-spin text-primary" />
        ) : (
          <ListChecks className="size-5" />
        )}
      </Button>
      <Popover
        placement="bottom end"
        offset={8}
        containerPadding={16}
        className="z-100 w-80 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl outline-none"
      >
        <Dialog aria-label={t("label")} className="outline-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{t("queue")}</span>
            <span>{t("running", { count: jobs.length })}</span>
          </div>
          {jobs.length ? (
            <div className="space-y-1 p-3">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={job.href as never}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                >
                  <LoaderCircle className="size-4 animate-spin text-primary" />
                  {t(`jobs.${job.label}`)}
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center gap-3 px-4 py-10 text-center">
              <CheckCircle2 className="size-9 text-emerald-600" />
              <p className="text-sm text-muted-foreground">{t("idle")}</p>
            </div>
          )}
          <div className="border-t border-border p-3">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("viewActivity")} →
            </Link>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
