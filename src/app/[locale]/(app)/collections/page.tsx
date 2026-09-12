import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { PosterBadge } from "@/components/poster-badge";
import { MediaPoster } from "@/components/media-poster";
import { LibraryPoster } from "@/components/library-poster";
import { Button } from "@/components/ui/button";
import { CollectionSearchForm } from "./collection-search-form";
import { getCurrentUser } from "@/server/auth/session";
import { collectionService, tmdbMetadataService } from "@/server/application/services";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = await getTranslations("Collections");
  const locale = await getLocale();
  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(params.page) || 1);
  const collections = await collectionService.listForUser(user.id);
  const collectionPosters = new Map(
    (
      await Promise.all(
        collections.flatMap((collection) =>
          collection.tmdbId
            ? [
                tmdbMetadataService
                  .getCollectionMetadata(collection.tmdbId, locale)
                  .then((metadata) => [collection.id, metadata.posterPath] as const)
                  .catch(() => [collection.id, null] as const),
              ]
            : [],
        ),
      )
    ).filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  const discovery = query
    ? await tmdbMetadataService.searchCollections(query, locale, page).catch(() => undefined)
    : undefined;
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{t("discover")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("discoverHelp")}</p>
        <CollectionSearchForm key={query} query={query} />
        {discovery && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discovery.results.map((item) => (
              <Link
                key={item.id}
                href={`/collections/${item.id}` as never}
                className="group flex min-w-0 gap-3 rounded-xl border border-border bg-background p-3 outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MediaPoster path={item.posterPath} alt={item.name} className="h-24 w-16 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-medium group-hover:text-primary">{item.name}</h3>
                  {item.overview && (
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.overview}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {discovery && discovery.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>{t("page", { page: discovery.page, total: discovery.totalPages })}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline">
                  <Link href={{ pathname: "/collections", query: { query, page: page - 1 } }}>{t("previous")}</Link>
                </Button>
              )}
              {page < discovery.totalPages && (
                <Button asChild variant="outline">
                  <Link href={{ pathname: "/collections", query: { query, page: page + 1 } }}>{t("next")}</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight">{t("libraryTitle")}</h2>
        {collections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={
                  (collection.tmdbId ? `/collections/${collection.tmdbId}` : `/collections/${collection.id}`) as never
                }
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative">
                  {collectionPosters.has(collection.id) ? (
                    <MediaPoster path={collectionPosters.get(collection.id)} alt={collection.name} />
                  ) : (
                    <LibraryPoster mediaItemId={collection.posterMediaItemId} title={collection.name} />
                  )}
                  <div className="absolute left-2 top-2">
                    <PosterBadge>{t(collection.source === "tmdb" ? "tmdb" : "manual")}</PosterBadge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h2 className="line-clamp-2 font-semibold leading-5 group-hover:text-primary">{collection.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("itemCount", { count: collection.itemCount })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
