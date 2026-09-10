"use client";

import Image from "next/image";
import { Film, UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { imageBlurDataUrl } from "@/lib/image-placeholder";

export function MediaPoster({
  path,
  alt,
  person = false,
  priority = false,
  compactFallback = false,
  className,
  badges,
}: {
  path?: string;
  alt: string;
  person?: boolean;
  priority?: boolean;
  compactFallback?: boolean;
  className?: string;
  badges?: React.ReactNode;
}) {
  const [failedPath, setFailedPath] = useState<string>();
  const [loadedPath, setLoadedPath] = useState<string>();
  return (
    <div
      className={cn("relative aspect-2/3 overflow-hidden bg-muted", className)}
      aria-busy={Boolean(path && failedPath !== path && loadedPath !== path)}
    >
      {path && failedPath !== path ? (
        <>
          <Image
            src={`https://image.tmdb.org/t/p/w500${path}`}
            alt={alt}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 220px"
            priority={priority}
            placeholder="blur"
            blurDataURL={imageBlurDataUrl}
            onLoad={() => setLoadedPath(path)}
            onError={() => setFailedPath(path)}
            className={`object-cover transition-[filter,opacity,transform] duration-300 ${loadedPath === path ? "opacity-100" : "scale-105 opacity-80 blur-xl"}`}
          />
        </>
      ) : (
        <div className="grid size-full place-items-center bg-linear-to-br from-muted to-muted-foreground/15 px-4 text-center text-muted-foreground">
          <div>
            <div
              className={cn(
                "mx-auto grid place-items-center rounded-full bg-background/70 shadow-sm",
                compactFallback ? "size-8" : "size-14",
              )}
            >
              {person ? (
                <UserRound className={compactFallback ? "size-4" : "size-7"} />
              ) : (
                <Film className={compactFallback ? "size-4" : "size-7"} />
              )}
            </div>
            {!compactFallback && <p className="mt-3 line-clamp-2 text-xs font-medium">{alt}</p>}
          </div>
        </div>
      )}
      {badges && (
        <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-1.5 bg-linear-to-b from-black/65 to-transparent p-2 text-white">
          {badges}
        </div>
      )}
    </div>
  );
}
