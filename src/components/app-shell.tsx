"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Clock3,
  Clapperboard,
  Compass,
  Home,
  Inbox,
  Library,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Button as AriaButton,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
import { logout } from "@/app/[locale]/login/actions";
import { UserAvatar } from "./user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { RecommendationProgress } from "./recommendation-progress";
import { NotificationToasts } from "./notification-toasts";
import { NotificationPeek } from "./notification-peek";
import { JobIndicator } from "./job-indicator";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const sidebarStorageKey = "cued.sidebar-collapsed";
const sidebarCookieName = "cued.sidebar-collapsed";

export function AppShell({
  children,
  user,
  unreadNotifications,
  initialSidebarCollapsed,
  showStatistics,
}: {
  children: React.ReactNode;
  user: { id: string; name: string; role: "user" | "admin"; avatarTag?: string | null };
  unreadNotifications: number;
  initialSidebarCollapsed: boolean;
  showStatistics: boolean;
}) {
  const t = useTranslations();
  const navT = useTranslations("Nav");
  const pathname = usePathname();
  const router = useRouter();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [statisticsVisible, setStatisticsVisible] = useState(showStatistics);
  const mobileSearchInput = useRef<HTMLInputElement>(null);
  const links = [
    { href: "/" as const, label: t("Nav.home"), icon: Home },
    { href: "/search" as const, label: t("Nav.search"), icon: Search },
    { href: "/explore" as const, label: t("Nav.explore"), icon: Compass },
    { href: "/library" as const, label: t("Nav.library"), icon: Library },
    { href: "/collections" as const, label: t("Nav.collections"), icon: Clapperboard },
    { href: "/recommendations" as const, label: t("Nav.recommendations"), icon: Sparkles },
    { href: "/following" as const, label: t("Nav.following"), icon: Bell },
    { href: "/history" as const, label: t("Nav.history"), icon: Clock3 },
    { href: "/settings" as const, label: t("Nav.settings"), icon: Settings },
    ...(statisticsVisible ? [{ href: "/statistics" as const, label: t("Nav.statistics"), icon: BarChart3 }] : []),
    ...(user.role === "admin"
      ? [
          { href: "/requests" as const, label: t("Nav.requests"), icon: Inbox },
          { href: "/settings/integrations" as const, label: t("Nav.integrations"), icon: Plug },
          { href: "/settings/users" as const, label: t("Nav.users"), icon: Users },
        ]
      : []),
  ];
  const isActive = (href: (typeof links)[number]["href"]) =>
    pathname === href || (href !== "/" && href !== "/settings" && pathname.startsWith(href));
  const collapseSidebarLabel = navT.has("collapseSidebar") ? navT("collapseSidebar") : navT("openMenu");
  const expandSidebarLabel = navT.has("expandSidebar") ? navT("expandSidebar") : navT("openMenu");

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const frame = window.requestAnimationFrame(() => mobileSearchInput.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchOpen]);

  useEffect(() => {
    let active = true;
    const refreshVisibility = async () => {
      try {
        const response = await fetch("/api/visibility", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { showStatistics?: boolean };
        if (active && typeof result.showStatistics === "boolean") setStatisticsVisible(result.showStatistics);
      } catch {
        // The server-rendered permission remains the safe fallback while temporarily offline.
      }
    };
    void refreshVisibility();
    window.addEventListener("focus", refreshVisibility);
    const interval = window.setInterval(refreshVisibility, 30_000);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshVisibility);
      window.clearInterval(interval);
    };
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem(sidebarStorageKey, String(next));
      document.cookie = `${sidebarCookieName}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      return next;
    });
  }

  function submitMobileSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query !== "string" || !query.trim()) return;
    setMobileSearchOpen(false);
    router.push({ pathname: "/search", query: { q: query.trim() } });
  }

  return (
    <div className={cn("min-h-dvh lg:grid", sidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[264px_1fr]")}>
      <a
        href="#main-content"
        className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 -translate-y-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-0 shadow-lg shadow-primary/20 transition-[opacity,transform] duration-200 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("Nav.skipToContent")}
      </a>
      <NotificationToasts />
      <aside className="sticky top-0 hidden h-dvh self-start overflow-hidden border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
        <div className={cn("flex items-center py-5", sidebarCollapsed ? "justify-center px-3" : "px-5")}>
          <Link
            href="/"
            aria-label={t("Nav.home")}
            className="inline-flex rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Brand compact={sidebarCollapsed} />
          </Link>
        </div>
        <nav
          className={cn("min-h-0 flex-1 overflow-y-auto", sidebarCollapsed ? "px-3" : "px-4")}
          aria-label="Primary navigation"
        >
          <div className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    "relative flex items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                    active && "bg-accent text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn("size-4.5", active && "text-primary")} />
                  <span className={cn("flex-1", sidebarCollapsed && "sr-only")}>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <div className={cn("shrink-0 border-t border-border/60 py-4", sidebarCollapsed ? "px-3" : "px-4")}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "flex w-full cursor-pointer items-center rounded-xl py-2.5 text-sm font-medium text-muted-foreground outline-none ring-offset-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
            )}
            aria-label={sidebarCollapsed ? expandSidebarLabel : collapseSidebarLabel}
            title={sidebarCollapsed ? expandSidebarLabel : collapseSidebarLabel}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            <span className={sidebarCollapsed ? "sr-only" : undefined}>
              {sidebarCollapsed ? expandSidebarLabel : collapseSidebarLabel}
            </span>
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 hidden h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-8 backdrop-blur-xl lg:flex xl:px-12">
          <form onSubmit={submitMobileSearch} className="relative mr-auto w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder={t("Search.placeholder")}
              aria-label={t("Search.label")}
              className="h-10 pl-9"
              required
            />
          </form>
          <JobIndicator />
          <NotificationPeek unreadCount={unreadNotifications} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("Nav.accountMenu")}
              >
                <UserAvatar userId={user.id} name={user.name} avatarTag={user.avatarTag} className="size-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{t(`Roles.${user.role}`)}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/profile/${user.id}` as never}>
                  <Users className="size-4" />
                  {t("Nav.profile")}
                </Link>
              </DropdownMenuItem>
              <form action={logout}>
                <DropdownMenuItem asChild>
                  <button className="w-full">
                    <LogOut className="size-4" />
                    {t("Nav.signOut")}
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <Link
              href="/"
              aria-label={t("Nav.home")}
              className="rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Brand compact />
            </Link>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none ring-offset-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("Search.label")}
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((value) => !value)}
              >
                {mobileSearchOpen ? <X className="size-5" /> : <Search className="size-5" />}
              </button>
              <JobIndicator />
              <NotificationPeek unreadCount={unreadNotifications} />
              <AriaMenuTrigger>
                <AriaButton
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground outline-none ring-offset-2 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("Nav.openMenu")}
                >
                  <Menu className="size-5" />
                </AriaButton>
                <AriaPopover
                  placement="bottom end"
                  offset={8}
                  className="z-50 min-w-56 rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-lg outline-none entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
                >
                  <AriaMenu aria-label={t("Nav.openMenu")} className="outline-none">
                    {links.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href);
                      return (
                        <AriaMenuItem
                          key={href}
                          id={href}
                          href={href}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent",
                            active && "bg-accent text-foreground",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className={cn("size-4", active && "text-primary")} />
                          {label}
                        </AriaMenuItem>
                      );
                    })}
                  </AriaMenu>
                </AriaPopover>
              </AriaMenuTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="shrink-0 cursor-pointer rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("Nav.accountMenu")}
                  >
                    <UserAvatar userId={user.id} name={user.name} avatarTag={user.avatarTag} className="size-9" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="truncate text-sm font-medium">{user.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{t(`Roles.${user.role}`)}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.id}` as never}>
                      <Users className="size-4" />
                      {t("Nav.profile")}
                    </Link>
                  </DropdownMenuItem>
                  <form action={logout}>
                    <DropdownMenuItem asChild>
                      <button className="w-full">
                        <LogOut className="size-4" />
                        {t("Nav.signOut")}
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              mobileSearchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <form onSubmit={submitMobileSearch} className="flex gap-3 border-t border-border/60 px-5 py-3">
                <Input
                  ref={mobileSearchInput}
                  name="q"
                  placeholder={t("Search.placeholder")}
                  aria-label={t("Search.label")}
                  className="h-11 min-w-0 flex-1"
                  required
                />
                <Button type="submit" className="h-11 shrink-0 px-4">
                  {t("Search.submit")}
                </Button>
              </form>
            </div>
          </div>
        </header>
        <RecommendationProgress />
        <main id="main-content" tabIndex={-1} className="min-w-0 w-full p-5 outline-none sm:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
