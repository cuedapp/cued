"use client";

import { type FormEvent, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type HistoryQuery = { filter: string; sort: string; type: string; status: string };

export function HistoryFilters({ query }: { query: HistoryQuery }) {
  const t = useTranslations("History");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextQuery = {
      status: String(data.get("status")),
      type: String(data.get("type")),
      filter: String(data.get("filter")),
      sort: String(data.get("sort")),
    };

    startTransition(() => {
      router.push({ pathname: "/history", query: nextQuery }, { scroll: false });
      form.closest("details")?.removeAttribute("open");
    });
  }

  return <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
    <FilterSelect name="status" label={t("progressLabel")} value={query.status} options={(["completed", "inProgress", "all"] as const).map((value) => ({ value, label: t(`statusFilter.${value}`) }))} />
    <FilterSelect name="type" label={t("typeLabel")} value={query.type} options={(["all", "movie", "series", "season"] as const).map((value) => ({ value, label: t(`typeFilter.${value}`) }))} />
    <FilterSelect name="filter" label={t("ratingFilterLabel")} value={query.filter} options={(["all", "rated", "unrated", "excluded"] as const).map((value) => ({ value, label: t(`filter.${value}`) }))} />
    <FilterSelect name="sort" label={t("sortLabel")} value={query.sort} options={(["recent", "rating", "title"] as const).map((value) => ({ value, label: t(`sort.${value}`) }))} />
    <button type="submit" disabled={isPending} className="h-10 cursor-pointer rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 sm:col-span-2 lg:col-span-1">{isPending ? t("applyingFilters") : t("applyFilters")}</button>
  </form>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span><select name={name} defaultValue={value} className="h-10 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
