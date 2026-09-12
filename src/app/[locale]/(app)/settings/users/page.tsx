import { Check, Library, ShieldCheck, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/session";
import { userDirectoryService } from "@/server/application/services";
import { RequestPolicyForm } from "./request-policy-form";
import { UserManagementList } from "./user-management-row";
import { Link } from "@/i18n/navigation";
import { PageIntro } from "@/components/page-intro";
import { ContentRatingForm } from "./content-rating-form";
import { AiChatPolicyForm } from "./ai-chat-policy-form";

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
                <CardContent className="space-y-5">
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">{t("contentRatingPolicy")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("contentRatingPolicyHelp")}</p>
                    </div>
                    <ContentRatingForm userId={user.id} locale={locale} maximumAge={user.maximumContentRatingAge} />
                  </section>
                  <section className="space-y-3 border-t border-border/70 pt-5">
                    <div>
                      <h3 className="text-sm font-semibold">{t("aiChatPolicy")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("aiChatPolicyHelp")}</p>
                    </div>
                    <AiChatPolicyForm
                      userId={user.id}
                      locale={locale}
                      enabled={user.aiChatEnabled}
                      dailyLimit={user.aiChatDailyLimit}
                    />
                  </section>
                  <section className="space-y-3 border-t border-border/70 pt-5">
                    <div>
                      <h3 className="text-sm font-semibold">{t("requestPolicy")}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t("requestPolicyHelp")}</p>
                    </div>
                    <RequestPolicyForm
                      userId={user.id}
                      locale={locale}
                      requireApproval={user.requestsRequireApproval}
                      disabled={user.role === "admin"}
                    />
                  </section>
                  <section className="space-y-3 border-t border-border/70 pt-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <Library className="size-4 text-primary" />
                        {t("permissions")}
                      </h3>
                      {importedLibraries.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t("librariesAllowed", {
                            count: importedLibraries.filter((library) => library.accessible).length,
                            total: importedLibraries.length,
                          })}
                        </span>
                      )}
                    </div>
                    {importedLibraries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noLibraries")}</p>
                    ) : (
                      <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
                        {importedLibraries.map((library) => (
                          <div key={library.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                            <span className="min-w-0 truncate">{library.name}</span>
                            <span
                              className={
                                library.accessible
                                  ? "flex shrink-0 items-center gap-1 text-emerald-700 dark:text-emerald-400"
                                  : "flex shrink-0 items-center gap-1 text-muted-foreground"
                              }
                            >
                              {library.accessible ? <Check className="size-4" /> : <X className="size-4" />}
                              {library.accessible ? t("allowed") : t("denied")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </CardContent>
                <CardFooter className="mt-auto justify-end">
                  <Button variant="outline" asChild>
                    <Link href={`/profile/${user.id}` as never}>{t("viewProfile")}</Link>
                  </Button>
                </CardFooter>
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
