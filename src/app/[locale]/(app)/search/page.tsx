import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { tmdbMetadataService } from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";
import { Button } from "@/components/ui/button";
import { SearchForm } from "./search-form";
import { CheckCircle2 } from "lucide-react";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const t = await getTranslations("Search");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  let result: Awaited<ReturnType<typeof tmdbMetadataService.search>> | undefined;
  let unavailable = false;
  if (query && user) {
    try {
      result = await tmdbMetadataService.search(user.id, query, locale, page);
    } catch {
      unavailable = true;
    }
  }
  const recentSearches = user ? await tmdbMetadataService.getRecentSearches(user.id) : [];

  return <div className="space-y-8">
    <header className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
    </header>
    <SearchForm query={query} recentSearches={recentSearches.map(({ query: recentQuery }) => recentQuery)} />

    {!query && <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("empty")}</div>}
    {unavailable && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive"><div className="font-medium">{t("unavailableTitle")}</div><div className="mt-1 text-sm">{t("unavailableBody")}</div></div>}
    {result && result.results.length === 0 && <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("noResults", { query })}</div>}
    {result && result.results.length > 0 && <>
      <div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">{t("resultsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("resultCount", { count: result.totalResults })}</p></div></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {result.results.map((item) => {
          const href = item.type === "person" ? `/people/${item.id}` as const : `/title/${item.type}/${item.id}` as const;
          return <Link key={`${item.type}-${item.id}`} href={href} className="group min-w-0 rounded-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
            <article className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-transform group-hover:-translate-y-1">
              <MediaPoster path={item.imagePath} alt={item.title} person={item.type === "person"} badges={item.available ? <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"><CheckCircle2 className="size-3.5" />{t("available")}</span> : undefined} />
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span>{t(`types.${item.type}`)}</span>{item.date && <span>· {item.date.slice(0, 4)}</span>}</div>
                <h2 className="line-clamp-2 font-semibold leading-5">{item.title}</h2>
                {item.type === "person" && item.department && <p className="truncate text-sm text-muted-foreground">{item.department}</p>}
              </div>
            </article>
          </Link>;
        })}
      </div>
      {result.totalPages > 1 && <nav className="flex justify-center gap-3" aria-label={t("pagination")}>
        {page > 1 && <Button asChild variant="outline"><Link href={{ pathname: "/search", query: { q: query, page: page - 1 } }}>{t("previous")}</Link></Button>}
        {page < result.totalPages && <Button asChild variant="outline"><Link href={{ pathname: "/search", query: { q: query, page: page + 1 } }}>{t("next")}</Link></Button>}
      </nav>}
    </>}
  </div>;
}
