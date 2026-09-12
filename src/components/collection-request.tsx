"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import type { RequestOptions } from "./request-button";

type Title = { tmdbId: number; title: string; arr: boolean; strm: boolean };
type Source = { id: string; title: string; groupName: string | null };

export function CollectionRequest({ titles, options }: { titles: Title[]; options: RequestOptions }) {
  const t = useTranslations("Collection");
  const locale = useLocale();
  const router = useRouter();
  const arrAvailable = titles.some((title) => title.arr);
  const strmAvailable = titles.some((title) => title.strm);
  const [source, setSource] = useState<"arr" | "strm">(arrAvailable ? "arr" : "strm");
  const [sourcesByTitle, setSourcesByTitle] = useState<Record<number, Source[]>>({});
  const [sourceIds, setSourceIds] = useState<Record<number, string>>({});
  const [loadingSources, setLoadingSources] = useState(!arrAvailable && strmAvailable);
  const [submitting, setSubmitting] = useState(false);
  const eligible = useMemo(
    () => titles.filter((title) => (source === "arr" ? title.arr : title.strm)),
    [source, titles],
  );

  useEffect(() => {
    if (source !== "strm" || arrAvailable || Object.keys(sourcesByTitle).length > 0) return;
    void loadTitleSources(titles.filter((title) => title.strm))
      .then(({ options: nextOptions, selected, failed }) => {
        setSourcesByTitle(nextOptions);
        setSourceIds(selected);
        if (failed > 0) toast.error(t("bulkSourcesFailed", { count: failed }));
      })
      .finally(() => setLoadingSources(false));
  }, [arrAvailable, source, sourcesByTitle, t, titles]);

  function selectAcquisitionSource(next: "arr" | "strm") {
    setSource(next);
    if (next !== "strm" || Object.keys(sourcesByTitle).length > 0) return;
    setLoadingSources(true);
    void loadTitleSources(titles.filter((title) => title.strm))
      .then(({ options: nextOptions, selected, failed }) => {
        setSourcesByTitle(nextOptions);
        setSourceIds(selected);
        if (failed > 0) toast.error(t("bulkSourcesFailed", { count: failed }));
      })
      .finally(() => setLoadingSources(false));
  }

  if (!arrAvailable && !strmAvailable) return null;

  async function submit() {
    setSubmitting(true);
    let completed = 0;
    const failed: string[] = [];
    for (const title of eligible) {
      try {
        const response = await fetch(source === "strm" ? "/api/requests/iptv" : "/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            source === "strm"
              ? { type: "movie", tmdbId: title.tmdbId, sourceId: sourceIds[title.tmdbId], locale }
              : {
                  type: "movie",
                  tmdbId: title.tmdbId,
                  rootFolderPath: options.defaultRootFolderPath,
                  qualityProfileId: options.defaultProfileId,
                },
          ),
        });
        if (!response.ok) throw new Error();
        completed += 1;
      } catch {
        failed.push(title.title);
      }
    }
    setSubmitting(false);
    if (completed > 0) toast.success(t("bulkComplete", { count: completed }));
    if (failed.length > 0) toast.error(t("bulkFailed", { count: failed.length }));
    if (completed > 0) router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <h3 className="font-semibold">{t("requestCollection")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("requestCollectionHelp", { count: eligible.length })}</p>
        </div>
        {arrAvailable && strmAvailable && (
          <label className="grid gap-1 text-sm">
            <span>{t("source")}</span>
            <select
              value={source}
              onChange={(event) => selectAcquisitionSource(event.target.value as "arr" | "strm")}
              className="h-10 rounded-lg border border-input bg-background px-3"
            >
              <option value="arr">Radarr</option>
              <option value="strm">STRM</option>
            </select>
          </label>
        )}
        <Button
          onClick={() => void submit()}
          disabled={
            submitting ||
            loadingSources ||
            eligible.length === 0 ||
            (source === "strm" && eligible.every((title) => !sourceIds[title.tmdbId]))
          }
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          {submitting ? t("requestingCollection") : t("requestMissing", { count: eligible.length })}
        </Button>
      </div>
      {source === "strm" && (
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border bg-background p-3">
          <p className="text-xs leading-5 text-muted-foreground">{t("strmSourcesHelp")}</p>
          {eligible.map((title) => (
            <label
              key={title.tmdbId}
              className="grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)] sm:items-center"
            >
              <span className="truncate font-medium">{title.title}</span>
              <select
                value={sourceIds[title.tmdbId] ?? ""}
                onChange={(event) => setSourceIds((current) => ({ ...current, [title.tmdbId]: event.target.value }))}
                disabled={loadingSources}
                aria-label={t("strmSourceFor", { title: title.title })}
                className="h-10 min-w-0 rounded-lg border border-input bg-background px-3"
              >
                {!sourceIds[title.tmdbId] && <option value="">{t("strmSourceUnavailable")}</option>}
                {(sourcesByTitle[title.tmdbId] ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.groupName ? `${item.groupName} · ${item.title}` : item.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

async function loadTitleSources(titles: Title[]) {
  const results = await Promise.all(
    titles.map(async (title) => {
      try {
        const response = await fetch(`/api/requests/iptv?type=movie&tmdbId=${title.tmdbId}`, { cache: "no-store" });
        const result = (await response.json()) as { sources?: Source[] };
        if (!response.ok || !result.sources?.length) throw new Error();
        return { title, sources: result.sources };
      } catch {
        return { title, sources: [] as Source[] };
      }
    }),
  );
  return {
    options: Object.fromEntries(results.map((result) => [result.title.tmdbId, result.sources])),
    selected: Object.fromEntries(results.map((result) => [result.title.tmdbId, result.sources[0]?.id ?? ""])),
    failed: results.filter((result) => result.sources.length === 0).length,
  };
}
