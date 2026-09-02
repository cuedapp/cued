"use client";

import { useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button as AriaButton } from "react-aria-components";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { HoverTooltip } from "./hover-tooltip";
import { mediaActionButtonVariants } from "./ui/media-action-button";

export function FollowButton({
  targetType,
  tmdbId,
  initialFollowing,
  iconOnly = false,
  className,
}: {
  targetType: "movie" | "series" | "person";
  tmdbId: number;
  initialFollowing: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const t = useTranslations("Following");
  const locale = useLocale();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  async function toggle() {
    setPending(true);
    try {
      const response = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, tmdbId, locale }),
      });
      const result = (await response.json()) as { following?: boolean; error?: string };
      if (!response.ok || result.following === undefined) throw new Error(result.error || t("failed"));
      setFollowing(result.following);
      toast.success(t(result.following ? "followed" : "unfollowed"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    } finally {
      setPending(false);
    }
  }
  const Icon = pending ? LoaderCircle : following ? BellOff : Bell;
  const label = t(pending ? "saving" : following ? "unfollow" : "follow");
  const button = (
    <AriaButton
      type="button"
      onPress={toggle}
      isDisabled={pending}
      aria-label={label}
      className={
        iconOnly
          ? `${mediaActionButtonVariants()} ${className ?? ""}`
          : `inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:cursor-wait data-[disabled]:opacity-50 ${className ?? ""}`
      }
    >
      <Icon className={`${iconOnly ? "size-4.5 shrink-0" : "size-4"} ${pending ? "animate-spin" : ""}`} />
      {!iconOnly && label}
    </AriaButton>
  );
  return iconOnly ? <HoverTooltip label={label}>{button}</HoverTooltip> : button;
}
