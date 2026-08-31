"use client";

import { ArchiveX, Film, Tv } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rankForViewingIntent, type ViewingIntentPreset } from "@/lib/viewing-intent";
import { ViewingIntentControls } from "@/components/viewing-intent-controls";
import { LibraryPoster } from "@/components/library-poster";

export type LibraryBrowserItem = {
  id: string;
  tmdbId: number | null;
  mediaType: "movie" | "series";
  title: string;
  year?: number;
  overview: string;
  reasons: string[];
  genreIds: number[];
  matchPercent: number;
  score: number;
  removedAt: string | null;
};

export function LibraryBrowser({ items }: { items: LibraryBrowserItem[] }) {
  const t = useTranslations("Library");
  const [presets, setPresets] = useState<ViewingIntentPreset[]>([]);
  const [text, setText] = useState("");
  const ranked = presets.length > 0 || text.trim() ? rankForViewingIntent(items, { presets, text }) : items;

  return <div className="space-y-6">
    <ViewingIntentControls presets={presets} text={text} onPresetsChange={setPresets} onTextChange={setText} />
    {ranked.length === 0 ? <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("empty")}</div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{ranked.map((item) => {
      const Icon = item.mediaType === "movie" ? Film : Tv;
      const body = <><div className="relative">{item.removedAt ? <div className="grid aspect-2/3 place-items-center bg-muted px-4 text-center text-muted-foreground"><div><ArchiveX className="mx-auto size-10" /><p className="mt-3 text-xs font-medium">{t("removed")}</p></div></div> : <LibraryPoster mediaItemId={item.id} title={item.title} />}<div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-linear-to-b from-black/70 to-transparent p-2 text-white"><span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium"><Icon className="size-3.5" />{t(`types.${item.mediaType}`)}</span>{item.removedAt && <span className="rounded-full bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">{t("removed")}</span>}</div></div><div className="p-3"><h2 className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{item.title}</h2>{item.year && <p className="mt-1 text-xs text-muted-foreground">{item.year}</p>}{item.overview && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.overview}</p>}</div></>;
      return <article key={item.id} className="group overflow-hidden rounded-2xl border border-border bg-card">{item.tmdbId ? <Link href={`/title/${item.mediaType}/${item.tmdbId}` as never} className="block h-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : body}</article>;
    })}</div>}
  </div>;
}
