import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { viewingIntentPresets, type ViewingIntentPreset } from "@/lib/viewing-intent";
import { getCurrentUser } from "@/server/auth/session";
import { libraryService } from "@/server/application/services";
import { LibraryBrowser } from "./library-browser";
import { LibraryFilters } from "./library-filters";

type LibraryParams = { type?: string; state?: string; page?: string; query?: string; genre?: string; rating?: string; ratingSource?: string; sort?: string; intent?: string; intentText?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = await getTranslations("Library");
  const params = await searchParams;
  const type = member(params.type, ["all", "movie", "series"] as const, "all");
  const state = member(params.state, ["all", "active", "removed"] as const, "active");
  const queryText = (params.query ?? "").trim().slice(0, 100);
  const genres = await libraryService.listGenres(user.id);
  const genre = genres.includes(params.genre ?? "") ? params.genre ?? "" : "";
  const minimumRating = numberMember(params.rating, [5, 6, 7, 8, 9] as const);
  const ratingSource = member(params.ratingSource, ["jellyfin", "tmdb", "imdb", "rottenTomatoes", "metacritic", "trakt"] as const, "jellyfin");
  const sort = member(params.sort, ["title", "year-desc", "year-asc", "rating", "added"] as const, "title");
  const intentPresets = (params.intent ?? "").split(",").filter((value): value is ViewingIntentPreset => viewingIntentPresets.includes(value as ViewingIntentPreset));
  const intentText = (params.intentText ?? "").trim().slice(0, 120);
  const requestedPage = Number(params.page ?? "1");
  const result = await libraryService.list(user.id, { type, state, query: queryText, genre, minimumRating, ratingSource, sort, intentPresets, intentText }, requestedPage);
  const query = { type, state, query: queryText, genre, rating: minimumRating?.toString() ?? "", ratingSource, sort, intent: intentPresets.join(","), intentText };

  return <div className="space-y-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{t("intro")}</p></header>
    <LibraryFilters values={{ type, state, query: queryText, genre, minimumRating, ratingSource, sort }} genres={genres} labels={{ filters: t("filters"), searchLabel: t("searchLabel"), searchPlaceholder: t("searchPlaceholder"), typeLabel: t("typeLabel"), stateLabel: t("stateLabel"), genreLabel: t("genreLabel"), allGenres: t("allGenres"), ratingSourceLabel: t("ratingSourceLabel"), ratingLabel: t("ratingLabel"), anyRating: t("anyRating"), sortLabel: t("sortLabel"), apply: t("apply"), clear: t("clear"), allTypes: t("allTypes"), allStates: t("allStates"), available: t("available"), removed: t("removed"), types: { movie: t("types.movie"), series: t("types.series") }, ratingSources: { jellyfin: t("ratingSources.jellyfin"), tmdb: t("ratingSources.tmdb"), imdb: t("ratingSources.imdb"), rottenTomatoes: t("ratingSources.rottenTomatoes"), metacritic: t("ratingSources.metacritic"), trakt: t("ratingSources.trakt") }, ratingMinimums: { "5": t("ratingAtLeast", { rating: 5 }), "6": t("ratingAtLeast", { rating: 6 }), "7": t("ratingAtLeast", { rating: 7 }), "8": t("ratingAtLeast", { rating: 8 }), "9": t("ratingAtLeast", { rating: 9 }) }, sort: { title: t("sort.title"), "year-desc": t("sort.yearDesc"), "year-asc": t("sort.yearAsc"), rating: t("sort.rating"), added: t("sort.added") } }} />
    <div className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{t("showing", { count: result.total })}</p>{state === "removed" && <p className="text-sm text-muted-foreground">{t("removedHelp")}</p>}</div>
    <LibraryBrowser key={`${intentPresets.join(",")}:${intentText}`} items={result.items} intentPresets={intentPresets} intentText={intentText} query={query} />
    {result.totalPages > 1 && <nav className="flex justify-center gap-3" aria-label={t("pagination")}>{result.page > 1 && <Link href={{ pathname: "/library", query: { ...query, page: result.page - 1 } }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("previous")}</Link>}<span className="px-2 py-2 text-sm text-muted-foreground">{t("page", { page: result.page, totalPages: result.totalPages })}</span>{result.page < result.totalPages && <Link href={{ pathname: "/library", query: { ...query, page: result.page + 1 } }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("next")}</Link>}</nav>}
  </div>;
}

function member<const T extends readonly string[]>(value: string | undefined, values: T, fallback: T[number]): T[number] { return values.includes(value ?? "") ? value as T[number] : fallback; }
function numberMember<const T extends readonly number[]>(value: string | undefined, values: T): T[number] | null { const parsed = Number(value); return values.includes(parsed) ? parsed as T[number] : null; }
