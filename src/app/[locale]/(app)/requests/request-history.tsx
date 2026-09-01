"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleX, Film, SearchX, TriangleAlert, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/components/user-avatar";

export interface HistoricRequest {
  id: string;
  mediaType: "movie" | "series";
  tmdbId: number;
  title: string;
  username: string;
  userId: string;
  avatarTag: string | null;
  reviewerName: string | null;
  status: "approved" | "rejected" | "failed";
  rootFolderPath: string | null;
  qualityProfile: string | null;
  reviewedAt: string;
  error: string | null;
}

export function RequestHistory({ items }: { items: HistoricRequest[] }) {
  const t = useTranslations("Requests");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [requester, setRequester] = useState("all");
  const requesters = useMemo(
    () => [...new Set(items.map((item) => item.username))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filtered = items.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      (type === "all" || item.mediaType === type) &&
      (requester === "all" || item.username === requester),
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{t("historyTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("historyIntro")}</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <Filter
          label={t("filterStatus")}
          value={status}
          onChange={setStatus}
          options={[
            ["all", t("allStatuses")],
            ["approved", t("statuses.approved")],
            ["rejected", t("statuses.rejected")],
            ["failed", t("statuses.failed")],
          ]}
        />
        <Filter
          label={t("filterType")}
          value={type}
          onChange={setType}
          options={[
            ["all", t("allTypes")],
            ["movie", t("types.movie")],
            ["series", t("types.series")],
          ]}
        />
        <Filter
          label={t("filterRequester")}
          value={requester}
          onChange={setRequester}
          options={[["all", t("allRequesters")], ...requesters.map((name) => [name, name] as const)]}
        />
      </div>
      <p className="text-sm text-muted-foreground">{t("showing", { shown: filtered.length, total: items.length })}</p>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <SearchX className="mx-auto mb-3 size-6" />
          {t("historyEmpty")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = item.mediaType === "movie" ? Film : Tv;
            const StatusIcon =
              item.status === "approved" ? CheckCircle2 : item.status === "rejected" ? CircleX : TriangleAlert;
            return (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/title/${item.mediaType}/${item.tmdbId}` as never}
                          className="font-display text-xl font-semibold hover:text-primary"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <UserAvatar
                            userId={item.userId}
                            name={item.username}
                            avatarTag={item.avatarTag}
                            className="size-6"
                          />
                          {t("requestedBy", { user: item.username })}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${item.status === "approved" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : item.status === "rejected" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}
                      >
                        <StatusIcon className="size-3.5" />
                        {t(`statuses.${item.status}`)}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <Detail label={t("reviewedAt")} value={item.reviewedAt} />
                      <Detail label={t("reviewedBy")} value={item.reviewerName ?? "—"} />
                      <Detail label={t("rootFolder")} value={item.rootFolderPath ?? "—"} />
                      <Detail label={t("qualityProfile")} value={item.qualityProfile ?? "—"} />
                    </dl>
                    {item.error && (
                      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 truncate text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}
