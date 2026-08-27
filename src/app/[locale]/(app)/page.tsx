import { ArrowUpRight, CheckCircle2, Database, EyeOff, Heart, Sparkles, Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStatus } from "@/components/system-status";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { recommendationService } from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";
import { RecommendationRefreshButton } from "@/components/recommendation-progress";
import { updateRecommendationFeedback } from "./recommendation-actions";

export default async function Dashboard() {
  const t = await getTranslations("Dashboard");
  const user = await getCurrentUser();
  const recommendations = user ? await recommendationService.getForDashboard(user.id).catch(() => []) : [];
  const hiddenRecommendations = user ? await recommendationService.getHidden(user.id).catch(() => []) : [];
  const movieRecommendations = recommendations.filter((item) => item.mediaType === "movie").slice(0, 6);
  const seriesRecommendations = recommendations.filter((item) => item.mediaType === "series").slice(0, 6);
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-4xl border border-border/60 bg-card px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-40 w-64 rotate-[-8deg] rounded-t-[5rem] border border-primary/15 bg-linear-to-t from-primary/12 to-transparent sm:block" />
        <div className="relative max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-4" />{t("eyebrow")}</div>
          <h1 className="font-display text-5xl font-semibold tracking-tighter sm:text-6xl">{t("title")}<span className="text-primary">.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{t("intro")}</p>
        </div>
      </section>

      <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-3xl font-semibold tracking-tight">{t("recommendationsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("recommendationsBody")}</p></div><div className="flex items-center gap-3"><Link href="/recommendations" className="text-sm font-medium text-primary hover:underline">{t("viewAll")}</Link><RecommendationRefreshButton /></div></div>
        {recommendations.length === 0 ? <Card className="p-8 text-center"><CardTitle>{t("emptyTitle")}</CardTitle><CardDescription className="mt-2">{t("emptyBody")}</CardDescription></Card> : <div className="space-y-8">{movieRecommendations.length > 0 && <RecommendationSection title={t("moviesForYou")} items={movieRecommendations} />}{seriesRecommendations.length > 0 && <RecommendationSection title={t("seriesForYou")} items={seriesRecommendations} />}</div>}
      </section>

      {hiddenRecommendations.length > 0 && <details className="rounded-2xl border border-border bg-card"><summary className="cursor-pointer px-5 py-4 text-sm font-medium">{t("hiddenRecommendations", { count: hiddenRecommendations.length })}</summary><div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">{hiddenRecommendations.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><span className="truncate text-sm font-medium">{item.title}</span><form action={updateRecommendationFeedback}><input type="hidden" name="recommendationId" value={item.id} /><button name="feedback" value="restore" className="inline-flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline"><Undo2 className="size-4" />{t("restore")}</button></form></div>)}</div></details>}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="min-h-48"><CardHeader><CardTitle>{t("tasteTitle")}</CardTitle><CardDescription>{t("tasteBody")}</CardDescription></CardHeader><CardContent><Link href="/history" className="text-sm font-medium text-primary hover:underline">{t("rateMore")}</Link></CardContent></Card>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Database className="size-5" /></div>
              <ArrowUpRight className="size-5 opacity-40" />
            </div>
            <CardTitle className="mt-5">{t("statusTitle")}</CardTitle>
            <CardDescription>{t("statusBody")}</CardDescription>
          </CardHeader>
          <CardContent><SystemStatus /></CardContent>
        </Card>
      </div>
    </div>
  );
}

type RecommendationItem = Awaited<ReturnType<typeof recommendationService.getForDashboard>>[number];

async function RecommendationSection({ title, items }: { title: string; items: RecommendationItem[] }) {
  const t = await getTranslations("Dashboard");
  return <section><h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">{items.map((item) => { const liked = item.sourceTitles.filter((source) => source.reason === "liked"); const watched = item.sourceTitles.filter((source) => source.reason === "watched"); return <article key={item.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card"><Link href={`/title/${item.mediaType}/${item.tmdbId}` as const} className="flex flex-1 flex-col"><MediaPoster path={item.posterPath ?? undefined} alt={item.title} className="rounded-none border-0" badges={<><span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">{item.matchPercent}%</span>{item.available && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm"><CheckCircle2 className="size-3.5" />{t("available")}</span>}</>} /><div className="flex-1 p-3"><h4 className="line-clamp-2 font-medium group-hover:text-primary">{item.title}</h4><p className="mt-1 text-xs text-muted-foreground">{item.releaseDate?.slice(0, 4) ?? t(`types.${item.mediaType}`)}</p>{liked.length > 0 && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t("becauseTitles", { titles: liked.map((source) => source.title).join(", ") })}</p>}{watched.length > 0 && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t("becauseWatched", { titles: watched.map((source) => source.title).join(", ") })}</p>}{item.sourceTitles.length === 0 && item.reasons.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{t("because", { reasons: item.reasons.join(", ") })}</p>}</div></Link><div className="mt-auto grid grid-cols-2 border-t border-border/60"><form action={updateRecommendationFeedback}><input type="hidden" name="recommendationId" value={item.id} /><button name="feedback" value={item.feedback === "moreLikeThis" ? "restore" : "moreLikeThis"} aria-label={t(item.feedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")} title={t(item.feedback === "moreLikeThis" ? "removeFeedback" : "moreLikeThis")} className="grid h-10 w-full cursor-pointer place-items-center text-muted-foreground hover:bg-accent hover:text-primary"><Heart className={`size-4 ${item.feedback === "moreLikeThis" ? "fill-current text-primary" : ""}`} /></button></form><form action={updateRecommendationFeedback}><input type="hidden" name="recommendationId" value={item.id} /><button name="feedback" value="notInterested" aria-label={t("notInterested")} title={t("notInterested")} className="grid h-10 w-full cursor-pointer place-items-center border-l border-border/60 text-muted-foreground hover:bg-accent hover:text-destructive"><EyeOff className="size-4" /></button></form></div></article>; })}</div></section>;
}
