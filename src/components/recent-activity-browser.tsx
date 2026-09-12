"use client";

import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { HoverTooltip } from "@/components/hover-tooltip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";

export type RecentActivityItem = {
  key: string;
  userId: string;
  displayName: string;
  avatarTag: string | null;
  title: string;
  href: string | null;
  episodeLabel: string | null;
  relativeDate: string;
  restricted: boolean;
};

type Labels = {
  mine: string;
  all: string;
  emptyMine: string;
  emptyAll: string;
  restricted: string;
};

export function RecentActivityBrowser({
  personalItems,
  allItems,
  allowAllUsers,
  labels,
}: {
  personalItems: RecentActivityItem[];
  allItems: RecentActivityItem[];
  allowAllUsers: boolean;
  labels: Labels;
}) {
  const [scope, setScope] = useState<"mine" | "all">(allowAllUsers ? "all" : "mine");
  const items = scope === "all" && allowAllUsers ? allItems : personalItems;

  return (
    <div className="space-y-3">
      {allowAllUsers && (
        <SegmentedControl
          value={scope}
          onValueChange={setScope}
          options={[
            { value: "all", label: labels.all },
            { value: "mine", label: labels.mine },
          ]}
          label={`${labels.mine} / ${labels.all}`}
        />
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border/70 px-4 py-5 text-sm text-muted-foreground">
          {scope === "all" && allowAllUsers ? labels.emptyAll : labels.emptyMine}
        </p>
      ) : (
        <ul className="grid overflow-hidden rounded-2xl border border-border/70 bg-card md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex min-w-0 items-center gap-2.5 border-b border-border/60 px-3 py-2.5 last:border-b-0 md:border-r md:nth-[2n]:border-r-0 xl:nth-[2n]:border-r xl:nth-[3n]:border-r-0"
            >
              <UserAvatar userId={item.userId} name={item.displayName} avatarTag={item.avatarTag} className="size-8" />
              <div className="min-w-0 flex-1">
                {scope === "all" && allowAllUsers && (
                  <p className="truncate text-xs text-muted-foreground">{item.displayName}</p>
                )}
                {item.href && !item.restricted ? (
                  <Link href={item.href as never} className="line-clamp-1 font-medium hover:text-primary">
                    {item.title}
                  </Link>
                ) : item.restricted ? (
                  <HoverTooltip label={labels.restricted}>
                    <span
                      tabIndex={0}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <LockKeyhole className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{item.title}</span>
                    </span>
                  </HoverTooltip>
                ) : (
                  <p className="line-clamp-1 font-medium">{item.title}</p>
                )}
                {item.episodeLabel && <p className="truncate text-xs text-muted-foreground">{item.episodeLabel}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{item.relativeDate}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
