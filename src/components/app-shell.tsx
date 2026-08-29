"use client";

import { BarChart3, Bell, Clock3, Home, Inbox, LogOut, Menu, Plug, Search, Settings, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
import { logout } from "@/app/[locale]/login/actions";
import { UserAvatar } from "./user-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { RecommendationProgress } from "./recommendation-progress";

export function AppShell({ children, user }: { children: React.ReactNode; user: { id: string; name: string; role: "user" | "admin"; avatarTag?: string | null } }) {
  const t = useTranslations();
  const pathname = usePathname();
  const links = [
    { href: "/" as const, label: t("Nav.home"), icon: Home },
    { href: "/search" as const, label: t("Nav.search"), icon: Search },
    { href: "/recommendations" as const, label: t("Nav.recommendations"), icon: Sparkles },
    { href: "/following" as const, label: t("Nav.following"), icon: Bell },
    { href: "/history" as const, label: t("Nav.history"), icon: Clock3 },
    { href: "/settings" as const, label: t("Nav.settings"), icon: Settings },
    ...(user.role === "admin" ? [
      { href: "/statistics" as const, label: t("Nav.statistics"), icon: BarChart3 },
      { href: "/requests" as const, label: t("Nav.requests"), icon: Inbox },
      { href: "/settings/integrations" as const, label: t("Nav.integrations"), icon: Plug },
      { href: "/settings/users" as const, label: t("Nav.users"), icon: Users },
    ] : []),
  ];
  const isActive = (href: (typeof links)[number]["href"]) => pathname === href || (href !== "/" && href !== "/settings" && pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh self-start overflow-hidden border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
        <div className="px-7 py-7">
          <Link href="/" aria-label={t("Nav.home")} className="inline-flex rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
            <Brand />
          </Link>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-4" aria-label="Primary navigation">
          <div className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", active && "bg-accent text-foreground")}><Icon className={cn("size-4.5", active && "text-primary")} />{label}</Link>;
          })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border/60 px-5 py-5">
          <div className="mb-3 flex items-center gap-3 px-2"><UserAvatar userId={user.id} name={user.name} avatarTag={user.avatarTag} /><div className="min-w-0"><div className="truncate text-sm font-medium text-foreground">{user.name}</div><div className="text-xs text-muted-foreground">{t(`Roles.${user.role}`)}</div></div></div>
          <form action={logout}><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><LogOut className="size-4" />{t("Nav.signOut")}</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/85 px-5 backdrop-blur-xl lg:hidden">
          <Link href="/" aria-label={t("Nav.home")} className="rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none ring-offset-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("Nav.openMenu")}>
                  <Menu className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" aria-label={t("Nav.openMenu")}>
                {links.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild className={cn(isActive(href) && "bg-accent text-foreground")}>
                    <Link href={href} aria-current={isActive(href) ? "page" : undefined}>
                      <Icon className={cn("size-4", isActive(href) && "text-primary")} />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring" aria-label={t("Nav.accountMenu")}><UserAvatar userId={user.id} name={user.name} avatarTag={user.avatarTag} className="size-9" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel><div className="truncate text-sm font-medium">{user.name}</div><div className="text-xs font-normal text-muted-foreground">{t(`Roles.${user.role}`)}</div></DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={logout}><DropdownMenuItem asChild><button className="w-full"><LogOut className="size-4" />{t("Nav.signOut")}</button></DropdownMenuItem></form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <RecommendationProgress className="sticky top-16 z-10 mx-5 mt-3 lg:fixed lg:bottom-32 lg:left-5 lg:top-auto lg:z-30 lg:m-0 lg:w-56" />
        <main className="mx-auto w-full max-w-360 p-5 sm:p-8 lg:p-12">{children}</main>
      </div>
    </div>
  );
}
