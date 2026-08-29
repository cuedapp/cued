import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, followService, radarrIntegrationService, sonarrIntegrationService, tmdbMetadataService } from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";
import { FollowButton } from "@/components/follow-button";
import { RequestButton } from "@/components/request-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const user = await getCurrentUser();
  if (!user) notFound();
  const locale = await getLocale();
  const t = await getTranslations("Person");
  let person;
  try {
    person = await tmdbMetadataService.getPerson(user.id, id, locale);
  } catch {
    notFound();
  }
  const visibleCredits = person.credits.slice(0, 60);
  const [isFollowing, radarr, sonarr, requestStates] = await Promise.all([
    followService.isFollowing(user.id, "person", id),
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    acquisitionService.getStates(visibleCredits.map((credit) => ({ type: credit.type, tmdbId: credit.id }))).catch(() => ({} as Record<string, "idle" | "pending" | "existing">)),
  ]);
  const allowRequestOptions = user.role === "admin" || !user.requestsRequireApproval;
  const [radarrOptions, sonarrOptions] = allowRequestOptions ? await Promise.all([
    radarr.configured ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
    sonarr.configured ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] })) : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
  ]) : [{ rootFolders: [], qualityProfiles: [], tags: [] }, { rootFolders: [], qualityProfiles: [], tags: [] }];

  return <div className="space-y-10">
    <section className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
      <MediaPoster path={person.profilePath} alt={person.name} person priority className="w-44 rounded-3xl md:w-full" />
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{person.department ?? t("person")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter sm:text-6xl">{person.name}</h1><div className="mt-4"><FollowButton targetType="person" tmdbId={id} initialFollowing={isFollowing} /></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{person.birthday && <span>{t("born", { date: person.birthday })}</span>}{person.deathday && <span>{t("died", { date: person.deathday })}</span>}{person.placeOfBirth && <span>{person.placeOfBirth}</span>}</div><p className="mt-6 whitespace-pre-line leading-8 text-muted-foreground">{person.biography || t("noBiography")}</p></div>
    </section>
    <section><h2 className="font-display text-3xl font-semibold tracking-tight">{t("credits")}</h2>{visibleCredits.length === 0 ? <p className="mt-4 text-muted-foreground">{t("noCredits")}</p> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">{visibleCredits.map((credit) => { const overview = credit.type === "movie" ? radarr : sonarr; const options = credit.type === "movie" ? radarrOptions : sonarrOptions; return <article key={`${credit.type}-${credit.id}-${credit.role}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card"><Link href={`/title/${credit.type}/${credit.id}` as const} className="flex flex-1 flex-col outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><MediaPoster path={credit.posterPath} alt={credit.title} badges={<MediaCapabilityBadges available={credit.available} strmAvailable={credit.strmAvailable} strmPending={credit.strmPending} strmRequestable={credit.m3uAvailable} availableLabel={t("available")} strmAvailableLabel={t("strmAvailable")} strmPendingLabel={t("strmPending")} strmRequestableLabel={t("strmRequestable")} />} /><div className="flex-1 space-y-1.5 p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{credit.date?.slice(0, 4) ?? t(`types.${credit.type}`)}</div><div className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{credit.title}</div><div className="line-clamp-2 text-sm text-muted-foreground">{credit.role}</div></div></Link>{(overview.configured || credit.m3uAvailable) && <div className="mt-auto border-t border-border/60 p-3 [&>button]:w-full"><RequestButton type={credit.type} tmdbId={credit.id} compact allowOptions={allowRequestOptions} arrAvailable={overview.configured} strmAvailable={credit.m3uAvailable && !credit.available && !credit.strmAvailable && !credit.strmPending} strmAlreadyAvailable={credit.strmAvailable} strmImportPending={credit.strmPending} options={{ rootFolders: options.rootFolders, profiles: options.qualityProfiles, defaultRootFolderPath: overview.rootFolderPath, defaultProfileId: overview.qualityProfileId }} initialState={credit.available ? "available" : requestStates[`${credit.type}:${credit.id}`] ?? "idle"} /></div>}</article>; })}</div>}</section>
  </div>;
}
