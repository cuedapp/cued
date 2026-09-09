"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button as AriaButton, Tooltip, TooltipTrigger } from "react-aria-components";
import { toast } from "sonner";
import { AppDialog } from "./app-dialog";
import { mediaActionButtonVariants } from "./ui/media-action-button";
import { Button } from "./ui/button";

const storageKey = "cued:confirm-pending-request-removal";

export function PendingRequestRemovalButton({
  type,
  tmdbId,
  iconOnly = false,
  compact = false,
  actionCell = false,
  onRemoved,
}: {
  type: "movie" | "series";
  tmdbId: number;
  iconOnly?: boolean;
  compact?: boolean;
  actionCell?: boolean;
  onRemoved?: () => void;
}) {
  const t = useTranslations("PendingRequestRemoval");
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  function requestRemoval() {
    if (window.localStorage.getItem(storageKey) === "false") void remove();
    else setDialogOpen(true);
  }
  async function remove() {
    setRemoving(true);
    try {
      const response = await fetch(`/api/requests?type=${type}&tmdbId=${tmdbId}`, { method: "DELETE" });
      const result = (await response.json()) as { removed?: boolean; error?: string };
      if (!response.ok || !result.removed) throw new Error(result.error || t("failed"));
      if (dontAskAgain) window.localStorage.setItem(storageKey, "false");
      setDialogOpen(false);
      toast.success(t("removed"));
      onRemoved?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    } finally {
      setRemoving(false);
    }
  }
  const label = t("remove");
  const button = actionCell ? (
    <AriaButton
      type="button"
      onPress={requestRemoval}
      isDisabled={removing}
      aria-label={label}
      className={mediaActionButtonVariants({ intent: "default", className: "text-destructive hover:text-destructive" })}
    >
      {removing ? (
        <LoaderCircle className="size-4.5 shrink-0 animate-spin" />
      ) : (
        <Trash2 className="size-4.5 shrink-0" />
      )}
    </AriaButton>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size={iconOnly || actionCell ? "icon" : "default"}
      onClick={requestRemoval}
      disabled={removing}
      aria-label={label}
      className={`${compact ? "h-9 px-3 text-xs" : "h-10 px-3 text-sm"} text-destructive hover:text-destructive`}
    >
      {removing ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {!iconOnly && label}
    </Button>
  );
  return (
    <>
      {iconOnly || actionCell ? (
        <TooltipTrigger delay={500}>
          {button}
          <Tooltip
            placement="top"
            offset={8}
            containerPadding={12}
            className="z-100 max-w-52 rounded-md bg-foreground px-2.5 py-1.5 text-center text-xs font-semibold text-background shadow-xl"
          >
            {label}
          </Tooltip>
        </TooltipTrigger>
      ) : (
        button
      )}
      <AppDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} label={t("title")}>
        <div className="p-6">
          <h2 className="font-display text-2xl font-semibold">{t("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>
          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(event) => setDontAskAgain(event.target.checked)}
              className="size-4 accent-primary"
            />
            {t("dontAskAgain")}
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={removing}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void remove()} disabled={removing}>
              {removing && <LoaderCircle className="size-4 animate-spin" />}
              {t("confirm")}
            </Button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
