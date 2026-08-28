"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export interface RequestOptions {
  rootFolders: Array<{ id: number; path: string }>;
  profiles: Array<{ id: number; name: string }>;
  defaultRootFolderPath?: string;
  defaultProfileId?: number;
}

export function RequestButton({ type, tmdbId, compact = false, options, allowOptions = false, initialState = "idle" }: { type: "movie" | "series"; tmdbId: number; compact?: boolean; options?: RequestOptions; allowOptions?: boolean; initialState?: "idle" | "pending" | "existing" | "available" }) {
  const t = useTranslations("MediaRequest");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "requested" | "existing" | "available">(initialState);
  const [rootFolderPath, setRootFolderPath] = useState(options?.rootFolders.find((folder) => folder.path === options.defaultRootFolderPath)?.path ?? options?.rootFolders[0]?.path);
  const [qualityProfileId, setQualityProfileId] = useState(options?.profiles.find((profile) => profile.id === options.defaultProfileId)?.id ?? options?.profiles[0]?.id);
  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, tmdbId, ...(allowOptions ? { rootFolderPath, qualityProfileId } : {}) }) });
      const result = await response.json() as { state?: "pending" | "requested" | "existing"; error?: string };
      if (!response.ok || !result.state) throw new Error(result.error || t("failed"));
      setState(result.state);
      dialog.current?.close();
      toast.success(t(result.state));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    } finally { setPending(false); }
  }
  const complete = state !== "idle";
  const optionsUnavailable = allowOptions && (!options || options.rootFolders.length === 0 || options.profiles.length === 0);
  return <><button type="button" onClick={() => allowOptions ? dialog.current?.showModal() : void submit()} disabled={pending || complete || optionsUnavailable} className={`${compact ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm"} inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-default disabled:opacity-70`}>
    {pending ? <LoaderCircle className="size-4 animate-spin" /> : complete ? <CheckCircle2 className="size-4" /> : <Download className="size-4" />}{t(pending ? "requesting" : state)}
  </button>{allowOptions && options && <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60"><div className="p-6"><h2 className="font-display text-2xl font-semibold">{t("dialogTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("dialogIntro")}</p><div className="mt-6 grid gap-4"><label className="grid gap-1.5 text-sm"><span className="font-medium">{t("rootFolder")}</span><select required value={rootFolderPath} onChange={(event) => setRootFolderPath(event.target.value)} className="h-11 min-w-0 cursor-pointer rounded-lg border border-input bg-background px-3 text-foreground">{options.rootFolders.map((folder) => <option key={folder.id} value={folder.path}>{folder.path}</option>)}</select></label><label className="grid gap-1.5 text-sm"><span className="font-medium">{t("profile")}</span><select required value={qualityProfileId} onChange={(event) => setQualityProfileId(Number(event.target.value))} className="h-11 min-w-0 cursor-pointer rounded-lg border border-input bg-background px-3 text-foreground">{options.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => dialog.current?.close()} disabled={pending} className="h-10 cursor-pointer rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:cursor-wait disabled:opacity-60">{t("cancel")}</button><button type="button" onClick={submit} disabled={pending || !rootFolderPath || !qualityProfileId} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}{t(pending ? "requesting" : "confirm")}</button></div></div></dialog>}</>;
}
