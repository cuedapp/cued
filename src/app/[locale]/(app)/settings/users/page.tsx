import { Check, ShieldCheck, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { userDirectoryService } from "@/server/application/services";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") notFound();
  const t = await getTranslations("Users");
  const users = await userDirectoryService.getUsers();

  return <div className="space-y-8">
    <header className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
    </header>
    <div className="grid gap-5 xl:grid-cols-2">
      {users.map((user) => <Card key={user.id}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserAvatar userId={user.id} name={user.displayName} avatarTag={user.primaryImageTag} className="size-12" />
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{user.displayName}</CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                {user.role === "admin" ? <ShieldCheck className="size-3.5" /> : <UserRound className="size-3.5" />}
                {t(`roles.${user.role}`)}{user.disabled ? ` · ${t("disabled")}` : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("permissions")}</div>
          <div className="space-y-2">
            {user.libraries.map((library) => <div key={library.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{library.name}{library.selected ? "" : ` · ${t("notImported")}`}</span>
              <span className={library.accessible ? "flex shrink-0 items-center gap-1 text-emerald-600" : "flex shrink-0 items-center gap-1 text-muted-foreground"}>
                {library.accessible ? <Check className="size-4" /> : <X className="size-4" />}
                {library.accessible ? t("allowed") : t("denied")}
              </span>
            </div>)}
            {user.libraries.length === 0 && <p className="text-sm text-muted-foreground">{t("noLibraries")}</p>}
          </div>
        </CardContent>
      </Card>)}
    </div>
  </div>;
}
