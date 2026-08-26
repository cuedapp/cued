import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { tmdbMetadataService } from "@/server/application/services";
import { MediaPoster } from "@/components/media-poster";

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

  return <div className="space-y-10">
    <section className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
      <MediaPoster path={person.profilePath} alt={person.name} person priority className="w-44 rounded-3xl md:w-full" />
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{person.department ?? t("person")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter sm:text-6xl">{person.name}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">{person.birthday && <span>{t("born", { date: person.birthday })}</span>}{person.deathday && <span>{t("died", { date: person.deathday })}</span>}{person.placeOfBirth && <span>{person.placeOfBirth}</span>}</div><p className="mt-6 whitespace-pre-line leading-8 text-muted-foreground">{person.biography || t("noBiography")}</p></div>
    </section>
    <section><h2 className="font-display text-3xl font-semibold tracking-tight">{t("credits")}</h2>{person.credits.length === 0 ? <p className="mt-4 text-muted-foreground">{t("noCredits")}</p> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">{person.credits.map((credit) => <Link key={`${credit.type}-${credit.id}-${credit.role}`} href={`/title/${credit.type}/${credit.id}` as const} className="group overflow-hidden rounded-2xl border border-border/60 bg-card outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><MediaPoster path={credit.posterPath} alt={credit.title} /><div className="space-y-1.5 p-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{credit.date?.slice(0, 4) ?? t(`types.${credit.type}`)}</div><div className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{credit.title}</div><div className="line-clamp-2 text-sm text-muted-foreground">{credit.role}</div>{credit.available && <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />{t("available")}</div>}</div></Link>)}</div>}</section>
  </div>;
}
