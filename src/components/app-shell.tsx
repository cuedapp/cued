"use client";

import { Home, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const links = [
    { href: "/" as const, label: t("Nav.home"), icon: Home },
    { href: "/settings" as const, label: t("Nav.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="hidden border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
        <div className="px-7 py-7"><Brand /></div>
        <nav className="flex flex-col gap-1 px-4" aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", active && "bg-accent text-foreground")}><Icon className={cn("size-4.5", active && "text-primary")} />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto px-7 py-6 text-xs leading-relaxed text-muted-foreground">{t("Common.brandTagline")}</div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/85 px-5 backdrop-blur-xl lg:hidden">
          <Brand />
          <nav className="flex gap-1" aria-label="Primary navigation">
            {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} className={cn("grid size-10 place-items-center rounded-lg text-muted-foreground", (href === "/" ? pathname === "/" : pathname.startsWith(href)) && "bg-accent text-primary")}><Icon className="size-5" /></Link>)}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-360 p-5 sm:p-8 lg:p-12">{children}</main>
      </div>
    </div>
  );
}
