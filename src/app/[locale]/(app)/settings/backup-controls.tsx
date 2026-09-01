"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="font-medium">{t("exportTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("exportHelp")}</p>
        </div>
        <Link
          href="/api/backup/user"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {t("downloadUser")}
        </Link>
      </section>
      {isAdmin && (
        <section className="space-y-3">
          <div>
            <h3 className="font-medium">{t("fullExportTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("fullExportHelp")}</p>
          </div>
          <Link
            href="/api/backup/full"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input px-4 text-sm font-medium"
          >
            {t("downloadFull")}
          </Link>
        </section>
      )}
      <section className="space-y-3 border-t border-border pt-6">
        <div>
          <h3 className="font-medium">{t("importTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("importHelp")}</p>
        </div>
        <Input
          ref={userInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          onChange={selectFile("user")}
        />
        <Button type="button" disabled={upload !== null} onClick={() => userInput.current?.click()}>
          {isUploading("user") ? t("importing") : t("importUser")}
        </Button>
        <UploadProgress progress={upload?.kind === "user" ? upload.progress : null} label={t("importing")} />
      </section>
      {isAdmin && (
        <section className="space-y-3">
          <div>
            <h3 className="font-medium">{t("fullImportTitle")}</h3>
            <p className="text-sm text-muted-foreground">{t("fullImportHelp")}</p>
          </div>
          <Input
            ref={fullInput}
            type="file"
            accept="application/gzip,application/json,.gz,.json"
            className="sr-only"
            tabIndex={-1}
            onChange={selectFile("full")}
          />
          <Button
            type="button"
            disabled={upload !== null}
            onClick={() => fullInput.current?.click()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isUploading("full") ? t("restoring") : t("restoreFull")}
          </Button>
          <UploadProgress progress={upload?.kind === "full" ? upload.progress : null} label={t("restoring")} />
          <p className="text-xs text-muted-foreground">{t("fullWarning")}</p>
        </section>
      )}
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
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRestore}
            >
              {t("restoreFull")}
            </Button>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}

function UploadProgress({ progress, label }: { progress: number | null; label: string }) {
  if (progress === null) return null;
  return (
    <div className="max-w-sm space-y-2" role="status" aria-live="polite">
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
