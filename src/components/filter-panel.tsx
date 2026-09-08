"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "./ui/button";

export function FilterPanel({
  title,
  help,
  activeLabel,
  clearLabel,
  clearDisabled,
  onClear,
  children,
  footer,
}: {
  title: string;
  help: string;
  activeLabel?: string;
  clearLabel: string;
  clearDisabled: boolean;
  onClear: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 sm:px-5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              {activeLabel && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {activeLabel}
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{help}</span>
          </span>
          <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={clearDisabled}>
          <RotateCcw className="size-4" />
          {clearLabel}
        </Button>
      </div>
      {open && (
        <>
          <div className="border-t border-border/70 p-4 sm:p-5">{children}</div>
          {footer && <div className="border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5">{footer}</div>}
        </>
      )}
    </section>
  );
}
