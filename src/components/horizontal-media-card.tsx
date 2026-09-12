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
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <Link href={href as never} className="flex min-w-0 flex-1 items-center gap-4">
          <MediaPoster path={posterPath} alt={title} compactFallback className="w-16 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">{children}</div>
        </Link>
        {trailing && <div className="self-start sm:self-auto">{trailing}</div>}
      </div>
      {footer && <div className="border-t border-border/60 p-3">{footer}</div>}
    </article>
  );
}
