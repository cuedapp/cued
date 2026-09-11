"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleX, Film, SearchX, TriangleAlert, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import { HorizontalMediaCard } from "@/components/horizontal-media-card";
import { ReapproveDialog } from "./reapprove-dialog";
import { FilterPanel } from "@/components/filter-panel";
import { Button } from "@/components/ui/button";
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
  available: boolean;
  rootFolderPath: string | null;
  qualityProfile: string | null;
  reviewedAt: string;
  error: string | null;
  posterPath?: string | null;
}

export function RequestHistory({
  items,
  locale,
  reviewOptions,
}: {
  items: HistoricRequest[];
  locale: string;
  reviewOptions: Record<
    "movie" | "series",
    {
      rootFolders: Array<{ id: number; path: string }>;
      qualityProfiles: Array<{ id: number; name: string }>;
      defaultRootFolderPath?: string;
      defaultProfileId?: number;
    }
  >;
}) {
  const t = useTranslations("Requests");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [requester, setRequester] = useState("all");
  const [applied, setApplied] = useState({ status: "all", type: "all", requester: "all" });
  const [visibleCount, setVisibleCount] = useState(12);
  const requesters = useMemo(
    () => [...new Set(items.map((item) => item.username))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const filtered = items.filter(
    (item) =>
      (applied.status === "all" || (item.available ? "available" : item.status) === applied.status) &&
      (applied.type === "all" || item.mediaType === applied.type) &&
      (applied.requester === "all" || item.username === applied.requester),
  );
  const activeCount = [status !== "all", type !== "all", requester !== "all"].filter(Boolean).length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("historyTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("historyIntro")}</p>
      </div>
      <FilterPanel
        title={t("filterTitle")}
        help={t("filterHelp")}
        activeLabel={activeCount > 0 ? t("activeFilters", { count: activeCount }) : undefined}
        clearLabel={t("clearFilters")}
        clearDisabled={activeCount === 0}
        onClear={() => {
          setStatus("all");
          setType("all");
          setRequester("all");
          setApplied({ status: "all", type: "all", requester: "all" });
          setVisibleCount(12);
        }}
        footer={
          <Button
            type="button"
            onClick={() => {
              setApplied({ status, type, requester });
              setVisibleCount(12);
            }}
            className="w-full sm:w-auto"
          >
            {t("applyFilters")}
          </Button>
        }
      >
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Filter
            label={t("filterStatus")}
            value={status}
            onChange={setStatus}
            options={[
              ["all", t("allStatuses")],
              ["available", t("statuses.available")],
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
      </FilterPanel>
      <p className="text-sm text-muted-foreground">
        {t("showing", { shown: Math.min(visibleCount, filtered.length), total: filtered.length })}
      </p>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <SearchX className="mx-auto mb-3 size-6" />
          {t("historyEmpty")}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((item) => {
            const Icon = item.mediaType === "movie" ? Film : Tv;
            const requestStatus = item.status === "approved" && item.available ? "available" : item.status;
            const StatusIcon =
              requestStatus === "available" || requestStatus === "approved"
                ? CheckCircle2
                : requestStatus === "rejected"
                  ? CircleX
                  : TriangleAlert;
            return (
              <HorizontalMediaCard
                key={item.id}
                href={`/title/${item.mediaType}/${item.tmdbId}`}
                title={item.title}
                posterPath={item.posterPath ?? undefined}
                trailing={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${requestStatus === "available" || requestStatus === "approved" ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" : requestStatus === "rejected" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}
                    >
                      <StatusIcon className="size-3.5" />
                      {t(`statuses.${requestStatus}`)}
                    </span>
                    {requestStatus === "rejected" && (
                      <ReapproveDialog
                        id={item.id}
                        locale={locale}
                        type={item.mediaType}
                        tmdbId={item.tmdbId}
                        title={item.title}
                        reviewOptions={reviewOptions[item.mediaType]}
                      />
                    )}
                  </div>
                }
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="size-3.5" />
                  {t(`types.${item.mediaType}`)}
                </div>
                <div className="mt-1 font-display text-lg font-semibold">{item.title}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <UserAvatar userId={item.userId} name={item.username} avatarTag={item.avatarTag} className="size-6" />
                  {t("requestedBy", { user: item.username })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("reviewedAt")}: {item.reviewedAt}
                </div>
                {item.error && <p className="mt-2 text-sm text-destructive">{item.error}</p>}
              </HorizontalMediaCard>
            );
          })}
        </div>
      )}
      {visibleCount < filtered.length && (
        <Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + 12)}>
          {t("showMore")}
        </Button>
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
    <label className="grid min-w-0 gap-1.5 text-sm">
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
