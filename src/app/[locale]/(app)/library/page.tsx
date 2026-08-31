import { SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { libraryService } from "@/server/application/services";
import { LibraryBrowser } from "./library-browser";

type LibraryParams = { type?: string; state?: string; page?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = await getTranslations("Library");
  const params = await searchParams;
  const type = member(params.type, ["all", "movie", "series"] as const, "all");
  const state = member(params.state, ["all", "active", "removed"] as const, "active");
  const requestedPage = Number(params.page ?? "1");
  const result = await libraryService.list(user.id, { type, state }, requestedPage);
  const query = { type, state };

  return <div className="space-y-8">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p><h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{t("intro")}</p></header>
    <form className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="flex items-center gap-2 font-medium sm:col-span-3"><SlidersHorizontal className="size-4 text-primary" />{t("filters")}</div>
      <Filter name="type" label={t("typeLabel")} value={type} options={[["all", t("allTypes")], ["movie", t("types.movie")], ["series", t("types.series")]]} />
      <Filter name="state" label={t("stateLabel")} value={state} options={[["all", t("allStates")], ["active", t("available")], ["removed", t("removed")]]} />
      <button type="submit" className="h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("apply")}</button>
    </form>
    <div className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{t("showing", { count: result.total })}</p>{state === "removed" && <p className="text-sm text-muted-foreground">{t("removedHelp")}</p>}</div>
    <LibraryBrowser items={result.items} />
    {result.totalPages > 1 && <nav className="flex justify-center gap-3" aria-label={t("pagination")}>{result.page > 1 && <Link href={{ pathname: "/library", query: { ...query, page: result.page - 1 } }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("previous")}</Link>}<span className="px-2 py-2 text-sm text-muted-foreground">{t("page", { page: result.page, totalPages: result.totalPages })}</span>{result.page < result.totalPages && <Link href={{ pathname: "/library", query: { ...query, page: result.page + 1 } }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">{t("next")}</Link>}</nav>}
  </div>;
}

function Filter({ name, label, value, options }: { name: string; label: string; value: string; options: ReadonlyArray<readonly [string, string]> }) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><select name={name} defaultValue={value} className="h-10 cursor-pointer rounded-lg border border-input bg-background px-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function member<const T extends readonly string[]>(value: string | undefined, values: T, fallback: T[number]): T[number] { return values.includes(value ?? "") ? value as T[number] : fallback; }
