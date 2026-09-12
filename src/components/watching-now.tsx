"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CirclePlay, Clock3, Monitor, Smartphone, Video } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import type { WatchingNowItem } from "@/server/application/watching-now.service";

type Labels = {
  empty: string;
  watching: string;
  progress: string;
  movie: string;
  episode: string;
  device: string;
  client: string;
  video: string;
  directPlay: string;
  directStream: string;
  transcoding: string;
};
type WatchingNowResponse = { items: WatchingNowItem[]; canSeeEveryone: boolean };
const refreshIntervalMs = 10_000;

export function WatchingNow({
  initialItems,
  canSeeEveryone,
  labels,
}: {
  initialItems: WatchingNowItem[];
  canSeeEveryone: boolean;
  labels: Labels;
}) {
  const [state, setState] = useState<WatchingNowResponse>({ items: initialItems, canSeeEveryone });

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const response = await fetch("/api/watching-now", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      setState((await response.json()) as WatchingNowResponse);
    };
    const interval = window.setInterval(() => void refresh(), refreshIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (state.items.length === 0)
    return (
      <p className="rounded-2xl border border-border/70 px-4 py-5 text-sm text-muted-foreground">{labels.empty}</p>
    );

  return (
    <ul className={cn("grid gap-4", state.items.length > 1 && "xl:grid-cols-2")}>
      {state.items.map((item) => (
        <li
          key={item.key}
          className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border/70 bg-card sm:grid-cols-[8rem_minmax(0,1fr)]"
        >
          <div className="relative min-h-36 bg-muted sm:min-h-40">
            <Image
              src={`/api/media/${encodeURIComponent(item.mediaItemId)}/image`}
              alt=""
              fill
              sizes="128px"
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
            <div className="min-w-0">
              {item.href ? (
                <Link
                  href={item.href as never}
                  className="line-clamp-2 text-base font-semibold hover:text-primary sm:text-lg"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="line-clamp-2 text-base font-semibold sm:text-lg">{item.title}</p>
              )}
              {item.episodeLabel && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{item.episodeLabel}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <CirclePlay className="size-5 shrink-0 text-emerald-500" aria-label={labels.watching} />
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {item.mediaType === "episode" ? labels.episode : labels.movie}
              </span>
              {item.elapsedSeconds !== null && item.runtimeSeconds !== null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {formatPlaybackTime(item.elapsedSeconds)} / {formatPlaybackTime(item.runtimeSeconds)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <UserAvatar userId={item.userId} name={item.displayName} avatarTag={item.avatarTag} className="size-8" />
              <span className="truncate text-sm font-medium">
                {state.canSeeEveryone ? item.displayName : labels.watching}
              </span>
            </div>

            {item.technical && (
              <div className="grid gap-1 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:gap-x-4">
                {item.technical.deviceName && (
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="size-3.5 text-sky-500" />
                    <strong className="text-foreground">{labels.device}:</strong> {item.technical.deviceName}
                  </span>
                )}
                {item.technical.clientName && (
                  <span className="inline-flex items-center gap-1.5">
                    <Smartphone className="size-3.5 text-violet-500" />
                    <strong className="text-foreground">{labels.client}:</strong> {item.technical.clientName}
                  </span>
                )}
                {(item.technical.playMethod || item.technical.videoCodec) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Video className="size-3.5 text-emerald-500" />
                    <strong className="text-foreground">{labels.video}:</strong>{" "}
                    {formatVideoDetails(item.technical, labels)}
                  </span>
                )}
              </div>
            )}

            {item.progress !== null && (
              <div
                className="mt-auto flex items-center gap-2"
                aria-label={labels.progress.replace("{progress}", String(item.progress))}
              >
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                </span>
                <span className="text-[11px] text-muted-foreground">{item.progress}%</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatPlaybackTime(seconds: number) {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatVideoDetails(technical: NonNullable<WatchingNowItem["technical"]>, labels: Labels) {
  const method =
    technical.playMethod === "DirectPlay"
      ? labels.directPlay
      : technical.playMethod === "DirectStream"
        ? labels.directStream
        : technical.playMethod === "Transcode"
          ? labels.transcoding
          : technical.playMethod;
  const bitrate = technical.videoBitRate ? `${(technical.videoBitRate / 1_000_000).toFixed(1)} Mbps` : null;
  return [method, technical.videoCodec, bitrate].filter(Boolean).join(" · ");
}
