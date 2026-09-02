"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "./ui/button";

export function MediaCarousel({
  children,
  showMoreHref,
  showMoreLabel,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode;
  showMoreHref: "/recommendations";
  showMoreLabel: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ atStart: true, atEnd: false });
  const updatePosition = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const edgeTolerance = 8;
    setPosition({
      atStart: element.scrollLeft <= edgeTolerance,
      atEnd: element.scrollLeft + element.clientWidth >= element.scrollWidth - edgeTolerance,
    });
  }, []);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(updatePosition));
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(element);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [updatePosition]);
  const scroll = (direction: -1 | 1) => {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.round(element.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="mb-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={previousLabel}
          disabled={position.atStart}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={nextLabel}
          disabled={position.atEnd}
          onClick={() => scroll(1)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <div
        ref={scroller}
        onScroll={updatePosition}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
        <div className="flex basis-40 min-w-40 shrink-0 snap-start lg:basis-44">
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-80 w-full rounded-2xl border-dashed text-base font-semibold"
          >
            <Link href={showMoreHref}>
              <span className="flex flex-col items-center gap-3 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                  <ArrowRight className="size-5" />
                </span>
                {showMoreLabel}
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
