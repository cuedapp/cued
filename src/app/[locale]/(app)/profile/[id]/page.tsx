import { BarChart3, CheckCircle2, CircleX, Clock3, Film, ShieldCheck, Star, TriangleAlert, Tv, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelativeDateTime } from "@/lib/date-time";
import { formatEstimatedWatchTime } from "@/lib/activity-time";
import { getCurrentUser } from "@/server/auth/session";
import { acquisitionService, activityService, libraryService, tmdbMetadataService, userDirectoryService } from "@/server/application/services";
import { Card, CardContent } from "@/components/ui/card";
import { canViewUserProfile } from "@/server/application/profile-access";

export default async function UserProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const { id } = await params;
  if (!canViewUserProfile(currentUser, id)) notFound();
  const [profile, query, locale, t, activityT, statistics] = await Promise.all([userDirectoryService.getUser(id), searchParams, getLocale(), getTranslations("Profile"), getTranslations("Activity"), activityService.getUserSummary(id)]);
  if (!profile) notFound();
  const requests = await acquisitionService.getForUser(id, Number(query.page ?? "1"));
  const requestTitles = requests.items.map(({ request }) => ({ type: request.mediaType === "series" ? "series" as const : "movie" as const, tmdbId: request.tmdbId }));
  const availableKeys = new Set(await libraryService.getAvailableKeys(id, requestTitles));
  const items = await Promise.all(requests.items.map(async ({ request, reviewerName }) => {
    const mediaType = request.mediaType === "series" ? "series" as const : "movie" as const;
    const title = await tmdbMetadataService.getTitle(currentUser.id, mediaType, request.tmdbId, locale).catch(() => undefined);
    const displayStatus = request.status === "approved" ? availableKeys.has(`${mediaType}:${request.tmdbId}`) ? "completed" as const : "requested" as const : request.status;
    return { request, reviewerName, mediaType, displayStatus, title: title?.title ?? t("unknownTitle", { id: request.tmdbId }) };
  }));

  const watchTime = formatEstimatedWatchTime(statistics?.estimatedWatchSeconds ?? 0);
  return <div className="space-y-8">
    <header className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center"><UserAvatar userId={profile.id} name={profile.displayName} avatarTag={profile.primaryImageTag} className="size-20" /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{id === currentUser.id ? t("yourProfile") : t("userProfile")}</p><h1 className="mt-2 truncate font-display text-4xl font-semibold tracking-tight">{profile.displayName}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">{profile.role === "admin" ? <ShieldCheck className="size-4" /> : <UserRound className="size-4" />}{t(`roles.${profile.role}`)}</p></div></header>
    <section className="space-y-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">{t("statisticsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{statistics?.lastPlayedAt ? t("lastWatched", { date: formatRelativeDateTime(statistics.lastPlayedAt, new Date(), locale, currentUser.dateFormat, currentUser.timeFormat) }) : t("notWatched")}</p></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><ProfileStat icon={<Clock3 className="size-4" />} label={t("watchTime")} value={activityT(watchTime.unit, { hours: watchTime.value, days: watchTime.value, weeks: watchTime.value })} /><ProfileStat icon={<BarChart3 className="size-4" />} label={t("watchedTitles")} value={statistics?.watchedTitles ?? 0} /><ProfileStat icon={<Star className="size-4" />} label={t("ratings")} value={statistics?.averageRating === null || !statistics ? t("noRatings") : t("rating", { rating: statistics.averageRating, count: statistics.ratings })} /><ProfileStat icon={<Film className="size-4" />} label={t("ratingCount")} value={statistics?.ratings ?? 0} /></div></section>
    <section className="space-y-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">{t("requestsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("requestsIntro")}</p></div><p className="text-sm text-muted-foreground">{t("requestCount", { count: requests.total })}</p>
      {items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("requestsEmpty")}</div> : <div className="space-y-3">{items.map(({ request, reviewerName, mediaType, displayStatus, title }) => {
        const Icon = mediaType === "movie" ? Film : Tv;
        const StatusIcon = displayStatus === "pending" ? Clock3 : displayStatus === "completed" || displayStatus === "requested" ? CheckCircle2 : displayStatus === "rejected" ? CircleX : TriangleAlert;
        const statusClass = displayStatus === "pending" ? "bg-amber-500/12 text-amber-700 dark:text-amber-400" : displayStatus === "completed" || displayStatus === "requested" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : displayStatus === "rejected" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive";
        return <article key={request.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/title/${mediaType}/${request.tmdbId}` as never} className="font-display text-xl font-semibold hover:text-primary">{title}</Link><p className="mt-1 text-sm text-muted-foreground">{t("requestedAt", { date: formatRelativeDateTime(request.createdAt, new Date(), locale, currentUser.dateFormat, currentUser.timeFormat) })}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}><StatusIcon className="size-3.5" />{t(`statuses.${displayStatus}`)}</span></div>{request.reviewedAt && <p className="mt-3 text-sm text-muted-foreground">{t("reviewed", { user: reviewerName ?? t("unknownReviewer"), date: formatRelativeDateTime(request.reviewedAt, new Date(), locale, currentUser.dateFormat, currentUser.timeFormat) })}</p>}{request.error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{request.error}</p>}</div></div></article>;
      })}</div>}
      {requests.totalPages > 1 && <nav className="flex justify-center gap-3" aria-label={t("pagination")}>{requests.page > 1 && <Link href={{ pathname: "/profile/[id]", params: { id }, query: { page: requests.page - 1 } } as never} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("previous")}</Link>}<span className="px-2 py-2 text-sm text-muted-foreground">{t("page", { page: requests.page, totalPages: requests.totalPages })}</span>{requests.page < requests.totalPages && <Link href={{ pathname: "/profile/[id]", params: { id }, query: { page: requests.page + 1 } } as never} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("next")}</Link>}</nav>}
    </section>
  </div>;
}

function ProfileStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) { return <Card><CardContent className="pt-6"><dt className="flex items-center gap-1.5 text-sm text-muted-foreground">{icon}{label}</dt><dd className="mt-2 font-display text-2xl font-semibold">{value}</dd></CardContent></Card>; }
