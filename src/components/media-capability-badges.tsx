"use client";

import { CheckCircle2, FilePlus2, LoaderCircle } from "lucide-react";
import { Button } from "react-aria-components";
import { HoverTooltip } from "./hover-tooltip";

export function MediaCapabilityBadges({ available, strmAvailable, strmPending, strmRequestable, availableLabel, strmAvailableLabel, strmPendingLabel, strmRequestableLabel }: { available: boolean; strmAvailable: boolean; strmPending: boolean; strmRequestable: boolean; availableLabel: string; strmAvailableLabel: string; strmPendingLabel: string; strmRequestableLabel: string }) {
  return <>{available && <CapabilityBadge label={availableLabel} tone="green"><CheckCircle2 className="size-4" /></CapabilityBadge>}{strmAvailable && !available && <CapabilityBadge label={strmAvailableLabel} tone="blue"><CheckCircle2 className="size-4" /></CapabilityBadge>}{strmPending && !available && !strmAvailable && <CapabilityBadge label={strmPendingLabel} tone="amber"><LoaderCircle className="size-4 animate-spin" /></CapabilityBadge>}{strmRequestable && !available && !strmAvailable && !strmPending && <CapabilityBadge label={strmRequestableLabel} tone="blue"><FilePlus2 className="size-4" /></CapabilityBadge>}</>;
}

function CapabilityBadge({ label, tone, children }: { label: string; tone: "green" | "blue" | "amber"; children: React.ReactNode }) {
  return <HoverTooltip label={label}><Button aria-label={label} className={`relative inline-grid size-7 cursor-default place-items-center rounded-full shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white ${tone === "green" ? "bg-emerald-600" : tone === "amber" ? "bg-amber-600" : "bg-sky-600"}`}><span className="text-white">{children}</span></Button></HoverTooltip>;
}
