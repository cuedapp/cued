"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function UserAvatar({
  userId,
  name,
  avatarTag,
  className,
}: {
  userId: string;
  name: string;
  avatarTag?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary",
        className,
      )}
    >
      <span aria-hidden="true">{initials}</span>
      {avatarTag && !failed && (
        <Image
          src={`/api/users/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(avatarTag)}`}
          alt=""
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
