"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateM3uEditorConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef } from "@/components/setup-wizard-shell";

type Library = { id: string; name: string; collectionType: string | null };
export function WizardM3uEditorForm({
  locale,
  overview,
}: {
  locale: string;
  overview: {
    baseUrl: string;
    username: string;
    playbackUsername: string;
    playlistUuid: string;
    playlists: Array<{ uuid: string; name: string }>;
    movieDirectory: string;
    seriesDirectory: string;
    refreshPlaylist: boolean;
    refreshJellyfin: boolean;
    movieLibraryIds: string[];
    seriesLibraryIds: string[];
    hasPassword: boolean;
    hasApiToken: boolean;
    libraries: Library[];
  };
}) {
  const t = useTranslations("M3uEditorIntegration");
  const wizardT = useTranslations("Wizard");
  const { markDirty, clearDirty, navigate, recordProvider } = useDirtyRef();
  const [tested, setTested] = useState(false);
  const [state, action] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateM3uEditorConfigurationWizard(previous, formData);
    if (result.tested) setTested(true);
    if (result.ok) {
      recordProvider("m3u-editor");
      clearDirty();
      navigate(`/${locale}/setup/ai`);
    }
    return result;
  }, {} as WizardFormState);
  function changed() {
    markDirty();
    setTested(false);
  }
  const playlists = state.playlists ?? overview.playlists;
  return (
    <form action={action} onChange={changed} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="intent" value="save" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("baseUrl")}</Label>
          <Input name="baseUrl" type="url" defaultValue={overview.baseUrl} required />
        </div>
        <div className="space-y-2">
          <Label>{t("username")}</Label>
          <Input name="username" defaultValue={overview.username} required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("password")}</Label>
          <Input
            name="password"
            type="password"
            placeholder={overview.hasPassword ? "••••••••" : undefined}
            required={!overview.hasPassword}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("apiToken")}</Label>
          <Input
            name="apiToken"
            type="password"
            placeholder={overview.hasApiToken ? "••••••••" : undefined}
            required={!overview.hasApiToken}
            autoComplete="off"
          />
        </div>
      </div>
      <input type="hidden" name="playbackUsername" value={overview.playbackUsername || overview.username} />
      <input type="hidden" name="movieDirectory" value={overview.movieDirectory || "Movies"} />
      <input type="hidden" name="seriesDirectory" value={overview.seriesDirectory || "Series"} />
      {tested ? (
        <>
          <div className="space-y-2">
            <Label>{t("playlist")}</Label>
            <select
              name="playlistUuid"
              defaultValue={overview.playlistUuid}
              required
              className="h-10 w-full rounded-lg border border-input bg-background px-3"
            >
              <option value="" disabled>
                {t("selectPlaylist")}
              </option>
              {playlists.map((playlist) => (
                <option key={playlist.uuid} value={playlist.uuid}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>
          <LibraryChoices
            title={t("movieLibraries")}
            name="movieLibraryIds"
            libraries={overview.libraries.filter((item) => item.collectionType === "movies")}
            selected={overview.movieLibraryIds}
          />
          <LibraryChoices
            title={t("seriesLibraries")}
            name="seriesLibraryIds"
            libraries={overview.libraries.filter((item) => item.collectionType === "tvshows")}
            selected={overview.seriesLibraryIds}
          />
          <input type="hidden" name="refreshPlaylist" value={overview.refreshPlaylist ? "on" : ""} />
          <input type="hidden" name="refreshJellyfin" value={overview.refreshJellyfin ? "on" : ""} />
        </>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {tested ? (
        <p role="status" className="text-sm text-emerald-700">
          {wizardT("form.connectionVerified")}
        </p>
      ) : null}
    </form>
  );
}
function LibraryChoices({
  title,
  name,
  libraries,
  selected,
}: {
  title: string;
  name: string;
  libraries: Library[];
  selected: string[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {libraries.map((library) => (
          <label key={library.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
            <input type="checkbox" name={name} value={library.id} defaultChecked={selected.includes(library.id)} />
            {library.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
