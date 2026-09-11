"use client";

import { Children, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadMoreList({
  children,
  initialCount = 12,
  showMoreLabel,
  showingTemplate,
  className,
}: {
  children: ReactNode;
  initialCount?: number;
  showMoreLabel: string;
  showingTemplate: string;
  className?: string;
}) {
  const items = Children.toArray(children);
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <div className={cn(className)}>{visibleItems}</div>
      {items.length > initialCount && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {showingTemplate.replace("{shown}", String(visibleItems.length)).replace("{total}", String(items.length))}
          </p>
          {visibleCount < items.length && (
            <Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + initialCount)}>
              {showMoreLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
