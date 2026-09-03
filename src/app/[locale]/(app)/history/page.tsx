import Image from "next/image";
import { Clock3, Film, SlidersHorizontal, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Pagination } from "@/components/pagination";
import { formatDisplayDate, formatDisplayTime, formatRelativeDate } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import { tasteService } from "@/server/application/services";
import { HistoryFilters } from "./history-filters";
import { RatingForm } from "./rating-form";

type HistoryParams = { filter?: string; sort?: string; type?: string; status?: string; page?: string };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<HistoryParams> }) {
  const user = await getCurrentUser();
  const t = await getTranslations("History");
  const locale = await getLocale();
  if (!user) return null;
  const params = await searchParams;
  const filter = member(params.filter, ["all", "rated", "unrated", "excluded"], "all");
  const sort = member(params.sort, ["recent", "rating", "title"], "recent");
  const type = member(params.type, ["all", "movie", "series", "season"], "all");
  const status = member(params.status, ["completed", "inProgress", "all"], "completed");
  const requestedPage = Number(params.page ?? "1");
  const allHistory = await tasteService.getHistory(user.id);
  const tagOrder = getTagOrder(allHistory.flatMap((item) => item.tags ?? []));
  const history = allHistory
    .filter((item) => status === "all" || (status === "completed" ? item.played : !item.played))
    .filter((item) =>
      type === "season"
        ? item.kind === "season"
        : (item.kind === "movie" || item.kind === "series") && (type === "all" || item.kind === type),
    )
    .filter(
      (item) =>
        filter === "all" ||
        (filter === "rated" && item.rating !== null) ||
        (filter === "unrated" && item.rating === null) ||
        (filter === "excluded" && item.excluded === true),
    )
    .sort((a, b) =>
      sort === "rating" ? (b.rating ?? 0) - (a.rating ?? 0) : sort === "title" ? a.name.localeCompare(b.name) : 0,
    );
  const totalPages = Math.max(1, Math.ceil(history.length / 20));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const pageHistory = history.slice((page - 1) * 20, page * 20);
  const query = { filter, sort, type, status };
  const now = new Date();
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="sm:hidden">
        <details className="group rounded-2xl border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
            <span className="flex items-center gap-3">
              <SlidersHorizontal className="size-5 text-primary" />
              <span>
                <span className="block font-medium">{t("filterAndSort")}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`statusFilter.${status}`)} · {t(`typeFilter.${type}`)} · {t(`sort.${sort}`)}
                </span>
              </span>
            </span>
            <span className="text-sm text-muted-foreground group-open:hidden">{t("openFilters")}</span>
            <span className="hidden text-sm text-muted-foreground group-open:inline">{t("closeFilters")}</span>
          </summary>
          <div className="border-t border-border p-4">
            <HistoryFilters query={query} />
          </div>
        </details>
      </div>
      <div className="hidden rounded-2xl border border-border bg-card p-5 sm:block">
        <div className="mb-4 flex items-center gap-2 font-medium">
          <SlidersHorizontal className="size-4 text-primary" />
          {t("filterAndSort")}
        </div>
        <HistoryFilters query={query} />
      </div>
      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {pageHistory.map((item) => {
              const titleHref =
                item.tmdbId && (item.kind === "movie" || item.kind === "series")
                  ? (`/title/${item.kind}/${item.tmdbId}` as const)
                  : undefined;
              return (
                <article key={item.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
                  <div className="flex gap-4 sm:gap-5">
                    <div className="relative aspect-2/3 w-20 shrink-0 self-start overflow-hidden rounded-xl bg-muted sm:w-28">
                      {item.removedAt ? (
                        <div className="grid size-full place-items-center gap-2 px-2 text-center text-xs text-muted-foreground">
                          <Film className="size-8" />
                          <span>{t("notAvailable")}</span>
                        </div>
                      ) : (
                        <Image
                          src={`/api/media/${item.id}/image`}
                          alt=""
                          fill
                          unoptimized
                          sizes="112px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                        title={
                          item.lastPlayedAt
                            ? `${formatDisplayDate(item.lastPlayedAt, user.dateFormat)} ${formatDisplayTime(item.lastPlayedAt, user.timeFormat, locale)}`
                            : undefined
                        }
                      >
                        <Clock3 className="size-3.5 shrink-0" />
                        <span>
                          {item.lastPlayedAt
                            ? t("watchedAt", {
                                date: formatRelativeDate(item.lastPlayedAt, now, locale, user.dateFormat),
                                time: formatDisplayTime(item.lastPlayedAt, user.timeFormat, locale),
                              })
                            : t("watched")}
                        </span>
                      </div>
                      {titleHref ? (
                        <Link
                          href={titleHref}
                          className="mt-2 block font-display text-2xl font-semibold hover:text-primary"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <h2 className="mt-2 font-display text-2xl font-semibold">{item.name}</h2>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(`types.${item.kind}`)} ·{" "}
                        {item.played
                          ? t(item.kind === "series" ? "caughtUp" : "completed")
                          : t("inProgress", { percentage: Math.round(item.playedPercentage ?? 0) })}
                      </p>
                      {item.rating && (
                        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                          <Star className="size-3.5 fill-current" />
                          {item.rating}/5
                        </div>
                      )}
                    </div>
                  </div>
                  <RatingForm
                    mediaItemId={item.id}
                    rating={item.rating}
                    feedback={item.feedback}
                    tags={item.tags ?? []}
                    excluded={item.excluded}
                    tagOrder={tagOrder}
                  />
                </article>
              );
            })}
          </div>
          <Pagination pathname="/history" query={query} page={page} totalPages={totalPages} label={t("pagination")} />
        </>
      )}
    </div>
  );
}

function getTagOrder(allTags: string[]) {
  const counts = new Map<string, number>();
  for (const tag of allTags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
}
function member<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  fallback: T[number],
): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
