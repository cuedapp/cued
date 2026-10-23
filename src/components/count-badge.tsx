import { cn } from "@/lib/utils";

export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground",
        className,
      )}
    >
      {count}
    </span>
  );
}
