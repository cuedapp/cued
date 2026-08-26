"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const t = useTranslations("Settings");
  if (!mounted) return <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />;
  const options = [{ id: "system", icon: Laptop }, { id: "light", icon: Sun }, { id: "dark", icon: Moon }] as const;
  return <div className="grid grid-cols-3 gap-2">{options.map(({ id, icon: Icon }) => <button key={id} onClick={() => setTheme(id)} className={cn("flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium transition-colors hover:bg-accent", theme === id && "border-primary/50 bg-primary/8 text-primary ring-1 ring-primary/20")}><Icon className="size-4" />{t(id)}</button>)}</div>;
}
