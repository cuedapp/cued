"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/app-dialog";

export function BackupControls({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("Backup");
  const restoreDialogT = useTranslations("BackupRestoreDialog");
  const cancelT = useTranslations("Recommendations");
  const userInput = useRef<HTMLInputElement>(null);
  const fullInput = useRef<HTMLInputElement>(null);
  const [selectedFullFile, setSelectedFullFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<{ kind: "user" | "full"; progress: number } | null>(null);

  async function uploadArchive(file: File, kind: "user" | "full") {
    setUpload({ kind, progress: 0 });
    try {
      const result = await postArchive(kind, file, (progress) => setUpload({ kind, progress }));
      if (result.error) throw new Error(result.error);
      if (kind === "full") {
        toast.success(t("restored"));
        window.location.assign(window.location.href);
        return;
      }
      if (result.result && typeof result.result !== "string") toast.success(t("userImported", result.result));
    } catch (error) {
      toast.error(t(`errors.${error instanceof Error && error.message === "forbidden" ? "forbidden" : "invalid"}`));
    } finally {
      setUpload(null);
    }
  }

  const selectFile = (kind: "user" | "full") => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (kind === "full") {
      setSelectedFullFile(file);
      return;
    }
    void uploadArchive(file, kind);
  };

  function confirmRestore() {
    const file = selectedFullFile;
    setSelectedFullFile(null);
    if (file) void uploadArchive(file, "full");
  }

  const isUploading = (kind: "user" | "full") => upload?.kind === kind;

  return (
    <>
      <div className={`space-y-5 ${isAdmin ? "2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-5 2xl:space-y-0" : ""}`}>
        <BackupSection title={t("personalData")} description={t("personalDataHelp")}>
          <BackupAction title={t("exportTitle")} description={t("exportHelp")}>
            <Button asChild>
              <Link href="/api/backup/user">
                <Download className="size-4" />
                {t("downloadUser")}
              </Link>
            </Button>
          </BackupAction>
          <BackupAction title={t("importTitle")} description={t("importHelp")}>
            <Input
              ref={userInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={selectFile("user")}
            />
            <Button type="button" disabled={upload !== null} onClick={() => userInput.current?.click()}>
              <Upload className="size-4" />
              {isUploading("user") ? t("importing") : t("importUser")}
            </Button>
          </BackupAction>
          <UploadProgress progress={upload?.kind === "user" ? upload.progress : null} label={t("importing")} />
        </BackupSection>

        {isAdmin && (
          <BackupSection title={t("installationData")} description={t("installationDataHelp")}>
            <BackupAction title={t("fullExportTitle")} description={t("fullExportHelp")}>
              <Button asChild variant="outline">
                <Link href="/api/backup/full">
                  <Download className="size-4" />
                  {t("downloadFull")}
                </Link>
              </Button>
            </BackupAction>
            <BackupAction danger title={t("fullImportTitle")} description={t("fullImportHelp")}>
              <Input
                ref={fullInput}
                type="file"
                accept="application/gzip,application/json,.gz,.json"
                className="sr-only"
                tabIndex={-1}
                onChange={selectFile("full")}
              />
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={upload !== null}
                  onClick={() => fullInput.current?.click()}
                >
                  <RotateCcw className="size-4" />
                  {isUploading("full") ? t("restoring") : t("restoreFull")}
                </Button>
                <p className="max-w-sm text-xs text-muted-foreground sm:text-right">{t("fullWarning")}</p>
              </div>
            </BackupAction>
            <UploadProgress progress={upload?.kind === "full" ? upload.progress : null} label={t("restoring")} />
          </BackupSection>
        )}
      </div>
      <AppDialog
        isOpen={selectedFullFile !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFullFile(null);
        }}
        label={t("fullImportTitle")}
      >
        <div className="p-6">
          <h2 className="font-display text-2xl font-semibold">{t("fullImportTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("restoreConfirm")}</p>
          <p className="mt-3 text-sm font-medium text-destructive">{restoreDialogT("signOutWarning")}</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setSelectedFullFile(null)}>
              {cancelT("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmRestore}>
              {t("restoreFull")}
            </Button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}

function BackupSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <header className="border-b border-border bg-muted/30 px-5 py-4">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function BackupAction({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between ${danger ? "border-destructive/40 bg-destructive/5" : "border-border"}`}
    >
      <div className="min-w-0 max-w-3xl">
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function UploadProgress({ progress, label }: { progress: number | null; label: string }) {
  if (progress === null) return null;
  return (
    <div className="space-y-2 px-1" role="status" aria-live="polite">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function postArchive(
  kind: "user" | "full",
  file: File,
  onProgress: (progress: number) => void,
): Promise<{ result?: { feedback: number; follows: number; skipped: number } | string; error?: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/backup/${kind}`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("invalid"));
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve(request.response)
        : reject(new Error(request.response?.error ?? "invalid"));
    const formData = new FormData();
    formData.set("archive", file);
    request.send(formData);
  });
}
