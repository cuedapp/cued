import Image from "next/image";
import { Film, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { tmdbImageUrl } from "@/server/integrations/tmdb/client";

export function MediaPoster({ path, alt, person = false, priority = false, className }: { path?: string; alt: string; person?: boolean; priority?: boolean; className?: string }) {
  return <div className={cn("relative aspect-2/3 overflow-hidden bg-muted", className)}>
    {path
      ? <Image src={tmdbImageUrl(path, "w500")} alt={alt} fill sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 220px" priority={priority} className="object-cover" />
      : <div className="grid size-full place-items-center text-muted-foreground">{person ? <UserRound className="size-10" /> : <Film className="size-10" />}</div>}
  </div>;
}
