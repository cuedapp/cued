import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MediaPoster } from "./media-poster";

export function HorizontalMediaCard({
  href,
  title,
  posterPath,
  children,
  trailing,
  footer,
  className,
}: {
  href: string;
  title: string;
  posterPath?: string;
  children: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 p-3 sm:gap-4 sm:p-4">
        <Link href={href as never} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <MediaPoster path={posterPath} alt={title} compactFallback className="w-14 shrink-0 rounded-lg sm:w-16" />
          <div className="min-w-0 flex-1">{children}</div>
        </Link>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {footer && <div className="border-t border-border/60 p-3">{footer}</div>}
    </article>
  );
}
