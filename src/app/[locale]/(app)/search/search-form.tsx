"use client";

import { type FormEvent } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchForm({ query, recentSearches }: { query: string; recentSearches: string[] }) {
  const router = useRouter();
  const t = useTranslations("Search");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    const nextQuery = typeof value === "string" ? value.trim() : "";

    if (nextQuery) {
      router.push({ pathname: "/search", query: { q: nextQuery } });
    }
  }

  return <div className="max-w-3xl space-y-3">
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative min-w-0 flex-1">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={query} placeholder={t("placeholder")} aria-label={t("label")} className="h-12 pl-11" required />
      </div>
      <Button type="submit" className="h-12 cursor-pointer px-6">{t("submit")}</Button>
    </form>
    {recentSearches.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("previousSearches")}</span>
      {recentSearches.map((recentQuery) => <button key={recentQuery} type="button" onClick={() => router.push({ pathname: "/search", query: { q: recentQuery } })} className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{recentQuery}</button>)}
    </div>}
  </div>;
}
