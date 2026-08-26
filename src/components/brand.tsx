import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_var(--primary)]">
        <Clapperboard className="size-5" strokeWidth={2.2} />
      </span>
      <span className={cn("font-display text-xl font-bold tracking-[-0.04em]", compact && "sr-only")}>Cued<span className="text-primary">.</span></span>
    </div>
  );
}
