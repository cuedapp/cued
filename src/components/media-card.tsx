import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { MediaPoster } from "./media-poster";

export function MediaCard({ href, posterPath, title, person = false, topLeft, badges, meta, secondary, aside, footer }: { href: string; posterPath?: string | null; title: string; person?: boolean; topLeft?: ReactNode; badges?: ReactNode; meta?: ReactNode; secondary?: ReactNode; aside?: ReactNode; footer?: ReactNode }) {
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
    <div className="relative shrink-0"><Link href={href as never} className="block overflow-hidden rounded-t-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><MediaPoster path={posterPath ?? undefined} alt={title} person={person} className="rounded-none border-0" /></Link>{(topLeft || badges) && <div className="absolute inset-x-0 top-0 flex items-start gap-1.5 bg-linear-to-b from-black/65 to-transparent p-2 text-white">{topLeft}<div className="ml-auto flex flex-wrap justify-end gap-1.5">{badges}</div></div>}</div>
    <div className="flex flex-1 items-start gap-2 p-3"><Link href={href as never} className="min-w-0 flex-1 rounded outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"><h2 className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{title}</h2>{meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}{secondary && <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{secondary}</div>}</Link>{aside}</div>
    {footer && <div className="mt-auto border-t border-border/60">{footer}</div>}
  </article>;
}
