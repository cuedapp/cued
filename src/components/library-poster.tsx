"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useState } from "react";
import { imageBlurDataUrl } from "@/lib/image-placeholder";

export function LibraryPoster({ mediaItemId, title }: { mediaItemId: string; title: string }) {
  const [state, setState] = useState({ mediaItemId, failed: false, loaded: false });
  const current = state.mediaItemId === mediaItemId ? state : { mediaItemId, failed: false, loaded: false };
  const { failed, loaded } = current;
  return (
    <div className="relative aspect-2/3 overflow-hidden bg-muted" aria-busy={!failed && !loaded}>
      {failed ? (
        <div className="grid size-full place-items-center bg-linear-to-br from-muted to-muted-foreground/15 px-4 text-center text-muted-foreground">
          <div>
            <Film className="mx-auto size-10" />
            <p className="mt-3 line-clamp-2 text-xs font-medium">{title}</p>
          </div>
        </div>
      ) : (
        <>
          <Image
            src={`/api/media/${mediaItemId}/image`}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 220px"
            placeholder="blur"
            blurDataURL={imageBlurDataUrl}
            onLoad={() => setState({ mediaItemId, failed: false, loaded: true })}
            onError={() => setState({ mediaItemId, failed: true, loaded: false })}
            className={`object-cover transition-[filter,opacity,transform] duration-300 ${loaded ? "opacity-100" : "scale-105 opacity-80 blur-xl"}`}
          />
        </>
      )}
    </div>
  );
}
