"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useState } from "react";

export function LibraryPoster({ mediaItemId, title }: { mediaItemId: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-2/3 overflow-hidden bg-muted">
      {failed ? (
        <div className="grid size-full place-items-center bg-linear-to-br from-muted to-muted-foreground/15 px-4 text-center text-muted-foreground">
          <div>
            <Film className="mx-auto size-10" />
            <p className="mt-3 line-clamp-2 text-xs font-medium">{title}</p>
          </div>
        </div>
      ) : (
        <Image
          src={`/api/media/${mediaItemId}/image`}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 25vw, 220px"
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}
