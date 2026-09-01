"use client";

import { useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";

export function FollowButton({
  targetType,
  tmdbId,
  initialFollowing,
}: {
  targetType: "movie" | "series" | "person";
  tmdbId: number;
  initialFollowing: boolean;
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
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background/70 px-4 text-sm font-semibold hover:bg-accent disabled:cursor-wait disabled:opacity-60"
    >
      <Icon className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {t(pending ? "saving" : following ? "unfollow" : "follow")}
    </button>
  );
}
