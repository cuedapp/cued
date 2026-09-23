"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export function LoadingBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function PageLoading() {
  const t = useTranslations("Nav");
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">{t("loadingPage")}</span>
      <header className="max-w-3xl space-y-3">
        <LoadingBlock className="h-3 w-32" />
        <LoadingBlock className="h-12 w-56 max-w-full" />
        <LoadingBlock className="h-5 w-full" />
      </header>
      <section className="grid gap-5 lg:grid-cols-2">
        <LoadingBlock className="h-56 rounded-2xl" />
        <LoadingBlock className="h-56 rounded-2xl" />
        <LoadingBlock className="h-56 rounded-2xl lg:col-span-2" />
      </section>
    </div>
  );
}
