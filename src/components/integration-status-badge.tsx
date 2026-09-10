import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntegrationStatus = "unconfigured" | "healthy" | "degraded" | undefined;

type StatusLabels = {
  healthy: string;
  degraded: string;
  unconfigured: string;
};

export function resolvedIntegrationStatus(status: IntegrationStatus, configured: boolean) {
  if (!configured) return "unconfigured" as const;
  return status === "healthy" ? ("healthy" as const) : ("degraded" as const);
}

export function IntegrationStatusBadge({
  status,
  configured,
  labels,
  className,
}: {
  status: IntegrationStatus;
  configured: boolean;
  labels: StatusLabels;
  className?: string;
}) {
  const resolved = resolvedIntegrationStatus(status, configured);
  const healthy = resolved === "healthy";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        healthy
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
          : resolved === "degraded"
            ? "bg-amber-500/12 text-amber-700 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {healthy ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
      {labels[resolved]}
    </span>
  );
}
