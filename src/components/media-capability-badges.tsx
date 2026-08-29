"use client";

import { CheckCircle2, FilePlus2, LoaderCircle } from "lucide-react";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MediaCapabilityBadges({ available, strmAvailable, strmPending, strmRequestable, availableLabel, strmAvailableLabel, strmPendingLabel, strmRequestableLabel }: { available: boolean; strmAvailable: boolean; strmPending: boolean; strmRequestable: boolean; availableLabel: string; strmAvailableLabel: string; strmPendingLabel: string; strmRequestableLabel: string }) {
  return <>{available && <CapabilityBadge label={availableLabel} tone="green"><CheckCircle2 className="size-4" /></CapabilityBadge>}{strmAvailable && <CapabilityBadge label={strmAvailableLabel} tone="blue"><CheckCircle2 className="size-4" /></CapabilityBadge>}{strmPending && !strmAvailable && <CapabilityBadge label={strmPendingLabel} tone="amber"><LoaderCircle className="size-4 animate-spin" /></CapabilityBadge>}{strmRequestable && !strmAvailable && !strmPending && <CapabilityBadge label={strmRequestableLabel} tone="blue"><FilePlus2 className="size-4" /></CapabilityBadge>}</>;
}

function CapabilityBadge({ label, tone, children }: { label: string; tone: "green" | "blue" | "amber"; children: React.ReactNode }) {
  const trigger = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [position, setPosition] = useState<{ left: number; top: number }>();
  function show() { const bounds = trigger.current?.getBoundingClientRect(); if (bounds) setPosition({ left: Math.min(Math.max(bounds.left + bounds.width / 2, 90), window.innerWidth - 90), top: bounds.bottom + 8 }); }
  return <><span ref={trigger} className="relative inline-grid size-8 place-items-center rounded-full shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white" tabIndex={0} aria-label={label} aria-describedby={position ? tooltipId : undefined} onMouseEnter={show} onMouseLeave={() => setPosition(undefined)} onFocus={show} onBlur={() => setPosition(undefined)}>
    <span className={`absolute inset-0 rounded-full ${tone === "green" ? "bg-emerald-600" : tone === "amber" ? "bg-amber-600" : "bg-sky-600"}`} />
    <span className="relative text-white">{children}</span>
  </span>{position && createPortal(<span id={tooltipId} role="tooltip" className="pointer-events-none fixed z-100 w-max max-w-52 -translate-x-1/2 rounded-md bg-neutral-950 px-2.5 py-1.5 text-center text-xs font-semibold text-white shadow-xl ring-1 ring-white/15 dark:bg-white dark:text-neutral-950 dark:ring-black/10" style={{ left: position.left, top: position.top }}>{label}</span>, document.body)}</>;
}
