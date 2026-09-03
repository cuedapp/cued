"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type QueryValue = string | number | undefined;

export function Pagination({
  pathname,
  query,
  page,
  totalPages,
  label,
  onNavigate,
}: {
  pathname: string;
  query?: Record<string, QueryValue>;
  page: number;
  totalPages: number;
  label: string;
  onNavigate?: (href: string) => void;
}) {
  const t = useTranslations("Common");
  if (totalPages <= 1) return null;
  const items = paginationItems(page, totalPages);
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    params.set("page", String(target));
    return `${pathname}?${params}`;
  };
  const controlClass =
    "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label={label}>
      {page > 1 ? (
        <Link
          href={href(page - 1) as never}
          className={controlClass}
          aria-label={t("previousPage")}
          onClick={
            onNavigate
              ? (event) => {
                  event.preventDefault();
                  onNavigate(href(page - 1));
                }
              : undefined
          }
        >
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <button
          type="button"
          className={`${controlClass} cursor-not-allowed opacity-40`}
          aria-label={t("previousPage")}
          disabled
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="grid size-10 place-items-center text-muted-foreground">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            aria-label={t("currentPage", { page: item })}
            className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={href(item) as never}
            className={controlClass}
            aria-label={t("pageNumber", { page: item })}
            onClick={
              onNavigate
                ? (event) => {
                    event.preventDefault();
                    onNavigate(href(item));
                  }
                : undefined
            }
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          href={href(page + 1) as never}
          className={controlClass}
          aria-label={t("nextPage")}
          onClick={
            onNavigate
              ? (event) => {
                  event.preventDefault();
                  onNavigate(href(page + 1));
                }
              : undefined
          }
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <button
          type="button"
          className={`${controlClass} cursor-not-allowed opacity-40`}
          aria-label={t("nextPage")}
          disabled
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </nav>
  );
}

function paginationItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((value) => value > 0 && value <= totalPages).sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (const value of sorted) {
    if (result.length && value - Number(result[result.length - 1]) > 1) result.push("ellipsis");
    result.push(value);
  }
  return result;
}
