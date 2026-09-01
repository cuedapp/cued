"use client";

import { CircleHelp, X } from "lucide-react";
import { Button, Dialog, DialogTrigger, Popover } from "react-aria-components";

export function RecommendationReasonPopover({
  title,
  closeLabel,
  aiTitle,
  becauseLiked,
  becauseWatched,
  becauseGenres,
  aiExplanation,
}: {
  title: string;
  closeLabel: string;
  aiTitle: string;
  becauseLiked?: string;
  becauseWatched?: string;
  becauseGenres?: string;
  aiExplanation?: string | null;
}) {
  return (
    <DialogTrigger>
      <Button
        aria-label={title}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none hover:bg-accent hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp className="size-4" />
      </Button>
      <Popover
        placement="bottom end"
        offset={8}
        containerPadding={16}
        className="z-100 w-72 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none"
      >
        <Dialog aria-label={title} className="outline-none">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{title}</p>
            <Button
              slot="close"
              aria-label={closeLabel}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            {becauseLiked && <p>{becauseLiked}</p>}
            {becauseWatched && <p>{becauseWatched}</p>}
            {becauseGenres && <p>{becauseGenres}</p>}
            {aiExplanation && (
              <div className="border-t border-border pt-3">
                <p className="font-medium text-foreground">{aiTitle}</p>
                <p className="mt-1 text-primary">{aiExplanation}</p>
              </div>
            )}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
