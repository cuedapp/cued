"use client";

import { useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "./ui/button";

export function ShowMoreButton({
  label,
  loadingLabel,
  href,
  onShowMore,
  loading = false,
  disabled = false,
}: {
  label: string;
  loadingLabel: string;
  href?: string;
  onShowMore?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const isLoading = loading || isNavigating;

  const handleShowMore = async () => {
    if (href) {
      startTransition(() => router.push(href as never, { scroll: false }));
      return;
    }
    const scrollY = window.scrollY;
    await onShowMore?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
    });
  };

  return (
    <Button type="button" variant="outline" onClick={handleShowMore} disabled={disabled || isLoading}>
      {isLoading && <LoaderCircle className="size-4 animate-spin" />}
      {isLoading ? loadingLabel : label}
    </Button>
  );
}
