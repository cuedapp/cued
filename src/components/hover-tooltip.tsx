"use client";

import { Tooltip, TooltipTrigger } from "react-aria-components";

export function HoverTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return <TooltipTrigger delay={500}>{children}<Tooltip placement="top" offset={8} containerPadding={12} className="z-100 max-w-52 rounded-md bg-foreground px-2.5 py-1.5 text-center text-xs font-semibold text-background shadow-xl">{label}</Tooltip></TooltipTrigger>;
}
