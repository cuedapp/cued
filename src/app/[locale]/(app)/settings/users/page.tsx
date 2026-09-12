import { ShieldCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { userDirectoryService } from "@/server/application/services";
import { UserManagementList } from "./user-management-row";
import { PageIntro } from "@/components/page-intro";
import { UserPolicyForm } from "./user-policy-form";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") notFound();
  const t = await getTranslations("Users");
  const locale = await getLocale();
  const users = await userDirectoryService.getUsers();

  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("intro")} />
      <Card>
        <CardHeader>
          <CardTitle>{t("managementTitle")}</CardTitle>
          <CardDescription>{t("managementDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UserManagementList initialUsers={users} currentUserId={currentUser.id} locale={locale} />
        </CardContent>
      </Card>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("detailsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("detailsDescription")}</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {users.map((user) => {
          const inactive = !user.accessEnabled || user.disabled;
          const importedLibraries = user.libraries.filter((library) => library.selected);
          return (
            <UserDetails key={user.id} inactive={inactive} name={user.displayName} label={t("showInactiveDetails")}>
              <Card className={inactive ? "border-0 opacity-75 shadow-none" : undefined}>
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      userId={user.id}
                      name={user.displayName}
                      avatarTag={user.primaryImageTag}
                      className="size-12"
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate">{user.displayName}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1.5">
                        {user.role === "admin" ? (
                          <ShieldCheck className="size-3.5" />
                        ) : (
                          <UserRound className="size-3.5" />
                        )}
                        {t(`roles.${user.role}`)}
                        {!user.accessEnabled
                          ? ` · ${t("inactive")}`
                          : user.disabled
                            ? ` · ${t("disabledInJellyfin")}`
                            : ""}
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${!user.accessEnabled || user.disabled ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}
                    >
                      {user.accessEnabled && !user.disabled ? t("active") : t("inactive")}
                    </span>
                  </div>
                </CardHeader>
                <UserPolicyForm
                  userId={user.id}
                  locale={locale}
                  maximumAge={user.maximumContentRatingAge}
                  aiChatEnabled={user.aiChatEnabled}
                  aiChatDailyLimit={user.aiChatDailyLimit}
                  requestsRequireApproval={user.requestsRequireApproval}
                  administrator={user.role === "admin"}
                  libraries={importedLibraries}
                />
              </Card>
            </UserDetails>
          );
        })}
      </div>
    </div>
  );
}

function UserDetails({
  inactive,
  name,
  label,
  children,
}: {
  inactive: boolean;
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!inactive) return children;
  return (
    <details className="overflow-hidden rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 marker:hidden">
        <span className="font-display text-xl font-semibold">{name}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </summary>
      <div className="border-t border-border/70">{children}</div>
    </details>
  );
}
