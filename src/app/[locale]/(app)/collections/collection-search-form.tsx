"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoadingButton } from "@/components/loading-button";
import { Input } from "@/components/ui/input";
import { useUrlFormNavigation } from "@/lib/use-url-form-navigation";

export function CollectionSearchForm({ query }: { query: string }) {
  const t = useTranslations("Collections");
  const { isPending, onSubmit } = useUrlFormNavigation((values) => ({
    query: String(values.get("query") ?? "").trim().slice(0, 100),
    page: undefined,
  }));

  return (
    <form onSubmit={onSubmit} className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <label className="col-span-2 text-sm font-medium" htmlFor="collection-query">
        {t("searchLabel")}
      </label>
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="collection-query"
          name="query"
          defaultValue={query}
          placeholder={t("searchPlaceholder")}
          className="h-11 min-w-0 pl-9"
        />
      </div>
      <LoadingButton type="submit" pending={isPending} className="h-11 shrink-0 px-4 sm:px-5">
        {t("search")}
      </LoadingButton>
    </form>
  );
}
