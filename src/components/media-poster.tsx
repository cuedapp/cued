"use client";

import Image from "next/image";
import { Film, UserRound } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MediaPoster({ path, alt, person = false, priority = false, className, badges }: { path?: string; alt: string; person?: boolean; priority?: boolean; className?: string; badges?: React.ReactNode }) {
  const [failedPath, setFailedPath] = useState<string>();
  return <div className={cn("relative aspect-2/3 overflow-hidden bg-muted", className)}>
    {path && failedPath !== path
      ? <Image src={`https://image.tmdb.org/t/p/w500${path}`} alt={alt} fill sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 220px" priority={priority} onError={() => setFailedPath(path)} className="object-cover" />
      : <div className="grid size-full place-items-center bg-linear-to-br from-muted to-muted-foreground/15 px-4 text-center text-muted-foreground"><div><div className="mx-auto grid size-14 place-items-center rounded-full bg-background/70 shadow-sm">{person ? <UserRound className="size-7" /> : <Film className="size-7" />}</div><p className="mt-3 line-clamp-2 text-xs font-medium">{alt}</p></div></div>}
    {badges && <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 bg-linear-to-b from-black/65 to-transparent p-2.5 text-white">{badges}</div>}
  </div>;
}
