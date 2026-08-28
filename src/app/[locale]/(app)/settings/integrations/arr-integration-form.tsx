"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateArrConfiguration, type ArrFormState } from "./actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: number; name?: string; path?: string; label?: string };

export function ArrIntegrationForm({ provider, locale, overview, rootFolders, qualityProfiles, tags }: { provider: "radarr" | "sonarr"; locale: string; overview: { baseUrl: string; hasApiKey: boolean; encryptionConfigured: boolean; rootFolderPath?: string; qualityProfileId?: number; tagIds: number[]; searchOnAdd: boolean; seriesMonitor: string }; rootFolders: Option[]; qualityProfiles: Option[]; tags: Option[] }) {
  const t = useTranslations("ArrIntegration");
  const [state, action] = useActionState(updateArrConfiguration, {} as ArrFormState);
  const visibleRootFolders = state.options?.rootFolders ?? rootFolders;
  const visibleQualityProfiles = state.options?.qualityProfiles ?? qualityProfiles;
  const visibleTags = state.options?.tags ?? tags;
  useEffect(() => { if (state.error) toast.error(t(`errors.${state.error}`)); if (state.result) toast.success(t(`results.${state.result}`)); }, [state, t]);
  return <form action={action} className="space-y-5">
    <input type="hidden" name="provider" value={provider} /><input type="hidden" name="locale" value={locale} />
    <div className="space-y-2"><Label htmlFor={`${provider}-url`}>{t("baseUrl")}</Label><Input id={`${provider}-url`} name="baseUrl" type="url" required defaultValue={overview.baseUrl} placeholder={provider === "radarr" ? "http://radarr:7878" : "http://sonarr:8989"} /><p className="text-xs text-muted-foreground">{t("baseUrlHelp")}</p></div>
    <div className="space-y-2"><Label htmlFor={`${provider}-key`}>{t("apiKey")}</Label><Input id={`${provider}-key`} name="apiKey" type="password" placeholder={overview.hasApiKey ? t("keyStored") : undefined} disabled={!overview.encryptionConfigured} autoComplete="off" /><p className="text-xs text-muted-foreground">{overview.encryptionConfigured ? t("apiKeyHelp") : t("encryptionHelp")}</p></div>
    {visibleRootFolders.length > 0 && <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`${provider}-root`}>{t("rootFolder")}</Label><select id={`${provider}-root`} name="rootFolderPath" defaultValue={overview.rootFolderPath} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3">{visibleRootFolders.map((folder) => <option key={folder.id} value={folder.path}>{folder.path}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`${provider}-profile`}>{t("qualityProfile")}</Label><select id={`${provider}-profile`} name="qualityProfileId" defaultValue={overview.qualityProfileId} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3">{visibleQualityProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></div></div>}
    {visibleRootFolders.length > 0 && <><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" name="searchOnAdd" defaultChecked={overview.searchOnAdd} className="mt-1 size-4 cursor-pointer accent-primary" /><span><span className="block text-sm font-medium">{t("searchOnAdd")}</span><span className="text-xs text-muted-foreground">{t("searchOnAddHelp")}</span></span></label>{provider === "sonarr" && <div className="space-y-2"><Label htmlFor="seriesMonitor">{t("seriesMonitor")}</Label><select id="seriesMonitor" name="seriesMonitor" defaultValue={overview.seriesMonitor} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background px-3">{["all", "future", "missing", "existing", "firstSeason", "lastSeason", "none"].map((value) => <option key={value} value={value}>{t(`monitor.${value}`)}</option>)}</select></div>}{provider === "radarr" && <input type="hidden" name="seriesMonitor" value="all" />}{visibleTags.length > 0 && <fieldset className="space-y-2"><legend className="text-sm font-medium">{t("tags")}</legend><div className="flex flex-wrap gap-2">{visibleTags.map((tag) => <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={overview.tagIds.includes(tag.id)} className="cursor-pointer accent-primary" />{tag.label}</label>)}</div></fieldset>}</>}
    <div className="flex flex-wrap gap-3"><FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")}>{t("test")}</FormSubmitButton><FormSubmitButton name="intent" value="save" pendingLabel={t("saving")}>{t("save")}</FormSubmitButton></div>
  </form>;
}
