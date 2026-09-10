import { CheckCircle2, CircleAlert, Clock3, LoaderCircle, RefreshCw, Sparkles, Tv2 } from "lucide-react";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatRelativeDateTime } from "@/lib/date-time";
import { getCurrentUser } from "@/server/auth/session";
import { jobActivityService, strmImportService } from "@/server/application/services";

const runIcon = {
  recommendations: Sparkles,
  jellyfin: RefreshCw,
  strm: Tv2,
  mediaRatings: Sparkles,
  m3u: RefreshCw,
};

type ActivityParams = { status?: string; source?: string };
const statuses = ["all", "running", "pending", "completed", "failed"] as const;
const sources = ["all", "recommendations", "jellyfin", "strm", "mediaRatings", "m3u"] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<ActivityParams> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [t, locale, runs, pendingImports] = await Promise.all([
    getTranslations("JobActivity"),
    getLocale(),
    jobActivityService.list(user.id, user.role === "admin"),
    strmImportService.getPendingForUser(user.id, user.role === "admin"),
  ]);
  const activeRuns = runs.filter((run) => run.status === "running" || run.status === "pending");
  const latestRunByKind = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!latestRunByKind.has(run.kind)) latestRunByKind.set(run.kind, run);
  }
  const attentionRuns = [...latestRunByKind.values()].filter((run) => run.status === "failed");
  const status = statuses.includes(params.status as (typeof statuses)[number]) ? (params.status as (typeof statuses)[number]) : "all";
  const source = sources.includes(params.source as (typeof sources)[number]) ? (params.source as (typeof sources)[number]) : "all";
  const visibleRuns = runs.filter((run) => (status === "all" || run.status === status) && (source === "all" || run.kind === source));

  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("summary")}>
        <SummaryCard icon={<LoaderCircle className="size-4" />} label={t("running")} value={activeRuns.length} tone="primary" />
        <SummaryCard icon={<Clock3 className="size-4" />} label={t("queued")} value={pendingImports.length} tone="muted" />
        <SummaryCard icon={<CircleAlert className="size-4" />} label={t("needsAttention")} value={attentionRuns.length} tone="danger" />
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t("history")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("historyDescription")}</p>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("statusFilter")}>
            {statuses.map((value) => <ActivityFilter key={value} active={status === value} href={{ pathname: "/activity", query: { status: value === "all" ? undefined : value, source: source === "all" ? undefined : source } }} label={t(`statusFilters.${value}`)} />)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("sourceFilter")}>
            {sources.map((value) => <ActivityFilter key={value} active={source === value} href={{ pathname: "/activity", query: { status: status === "all" ? undefined : status, source: value === "all" ? undefined : value } }} label={t(`sourceFilters.${value}`)} />)}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("showing", { count: visibleRuns.length })}</p>
        {visibleRuns.length === 0 ? (
          <Card>
            <CardContent className="grid min-h-48 place-items-center text-center text-sm text-muted-foreground">
              {runs.length === 0 ? t("empty") : t("emptyFiltered")}
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {visibleRuns.map((run) => {
              const Icon = runIcon[run.kind];
              const active = run.status === "running" || run.status === "pending";
              const failed = run.status === "failed";
              return (
                <article key={run.id} className={`flex gap-4 px-4 py-3 ${failed ? "bg-destructive/[0.03]" : ""}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${failed ? "bg-destructive/10 text-destructive" : active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {active ? <LoaderCircle className="size-5 animate-spin" /> : failed ? <CircleAlert className="size-5" /> : <Icon className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-medium">{t(`jobs.${run.kind}`)}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {run.phase ? t("phase", { phase: run.phase }) : run.detail ? t("processed", { count: run.detail }) : t("started")}
                          </p>
                        </div>
                        <Status status={run.status} label={t(`statuses.${run.status}`, { default: run.status })} />
                      </div>
                      {run.error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{run.error}</p>}
                      <time className="mt-3 block text-xs text-muted-foreground" dateTime={run.startedAt.toISOString()}>
                        {formatRelativeDateTime(run.startedAt, new Date(), locale, user.dateFormat, user.timeFormat)}
                      </time>
                    </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityFilter({ active, href, label }: { active: boolean; href: { pathname: "/activity"; query: { status?: string; source?: string } }; label: string }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{label}</Link>;
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "primary" | "muted" | "danger" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className={`grid size-10 place-items-center rounded-full ${colors[tone]}`}>{icon}</span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Status({ status, label }: { status: string; label: string }) {
  const completed = status === "completed";
  const failed = status === "failed";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${failed ? "bg-destructive/10 text-destructive" : completed ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}>
      {completed && <CheckCircle2 className="size-3.5" />}
      {label}
    </span>
  );
}
