import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MediaPoster } from "./media-poster";
import { ContentRatingBadge } from "./content-rating-badge";
import { LockKeyhole } from "lucide-react";

export function MediaCard({
  href,
  posterPath,
  title,
  person = false,
  topLeft,
  badges,
  meta,
  secondary,
  aside,
  footer,
  className,
  contentRatingAge,
  restrictedReason,
}: {
  href: string;
  posterPath?: string | null;
  title: string;
  person?: boolean;
  topLeft?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  secondary?: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentRatingAge?: number | null;
  restrictedReason?: string;
}) {
  const linked = (children: ReactNode, className: string) =>
    restrictedReason ? (
      <div className={className}>{children}</div>
    ) : (
      <Link href={href as never} className={className}>
        {children}
      </Link>
    );
  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
        !restrictedReason && "group",
        className,
      )}
    >
      <div className="relative shrink-0">
        {linked(
          <MediaPoster path={posterPath ?? undefined} alt={title} person={person} className="rounded-none border-0" />,
          "block overflow-hidden rounded-t-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
        )}
        {(topLeft || badges) && (
          <div className="absolute inset-x-0 top-0 flex items-start gap-1.5 bg-linear-to-b from-black/65 to-transparent p-2 text-white">
            {topLeft}
            <div className="ml-auto flex flex-wrap justify-end gap-1.5">{badges}</div>
          </div>
        )}
      </div>
      <div className="flex flex-1 items-start gap-2 p-3">
        {linked(
          <>
            <h2 className={cn("line-clamp-2 font-medium leading-5", !restrictedReason && "group-hover:text-primary")}>
              {title}
            </h2>
            {(meta || contentRatingAge !== undefined) && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {meta}
                <ContentRatingBadge age={contentRatingAge} />
              </div>
            )}
            {secondary && <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{secondary}</div>}
          </>,
          "min-w-0 flex-1 rounded outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
        )}
        {aside}
      </div>
      {footer && !restrictedReason && <div className="mt-auto min-h-10 overflow-hidden border-t border-border/60">{footer}</div>}
      {restrictedReason && (
        <div className="pointer-events-auto absolute inset-0 z-20 grid cursor-default place-items-center bg-background/75 p-4 text-center backdrop-blur-[2px]">
          <div className="max-w-48 rounded-2xl border border-border bg-card/95 p-4 shadow-lg">
            <LockKeyhole className="mx-auto size-5 text-primary" />
            <p className="mt-2 text-sm font-medium">{restrictedReason}</p>
          </div>
        </div>
      )}
    </article>
  );
}
