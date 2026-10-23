"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateM3uEditorConfigurationWizard, type WizardFormState } from "@/app/[locale]/setup/wizard-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyRef, useWizardPending } from "@/components/setup-wizard-shell";
import { interceptAcquisitionSubmit, markFormTouched, reportBatchResult } from "@/components/wizard-forms/batch-save";
import { keepFormValues, WizardTestButton } from "@/components/wizard-forms/wizard-test-button";

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
  const { ready, markDirty, clearDirty, navigate, recordProvider, saveAndContinue } = useDirtyRef();
  const formRef = useRef<HTMLFormElement>(null);
  const [tested, setTested] = useState(false);
  const [playlists, setPlaylists] = useState(overview.playlists);
  const [playlistUuid, setPlaylistUuid] = useState(overview.playlistUuid);
  const [state, action, pending] = useActionState(async (previous: WizardFormState, formData: FormData) => {
    const result = await updateM3uEditorConfigurationWizard(previous, formData);
    if (result.playlists) setPlaylists(result.playlists);
    if (result.tested) {
      setTested(true);
      toast.success(t("results.connected"));
    }
    if (result.error) {
      setTested(false);
      toast.error(t(`errors.${result.error}`));
    }
    if (formData.get("intent") === "save") {
      if (result.ok) {
        recordProvider("m3u-editor");
        toast.success(t("results.saved"));
        if (!reportBatchResult(formRef.current, true)) {
          clearDirty();
          navigate(`/${locale}/setup/ai`);
        }
      } else {
        markDirty();
        reportBatchResult(formRef.current, false);
      }
    }
    return result;
  }, {} as WizardFormState);
  useWizardPending(pending);

  function changed(event: ChangeEvent<HTMLFormElement>) {
    markFormTouched(formRef.current);
    markDirty();
    if (["baseUrl", "username", "password", "apiToken"].includes(event.target.name)) setTested(false);
  }
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => interceptAcquisitionSubmit(event, saveAndContinue)}
      onChange={changed}
      onReset={keepFormValues}
      className="space-y-4"
    >
      <fieldset disabled={!ready || pending} className="min-w-0 space-y-4">
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          {wizardT("buttons.continue")}
        </button>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="intent" value="save" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m3u-wizard-url">{t("baseUrl")}</Label>
            <Input id="m3u-wizard-url" name="baseUrl" type="url" defaultValue={overview.baseUrl} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m3u-wizard-username">{t("username")}</Label>
            <Input id="m3u-wizard-username" name="username" defaultValue={overview.username} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m3u-wizard-password">{t("password")}</Label>
            <Input
              id="m3u-wizard-password"
              name="password"
              type="password"
              placeholder={overview.hasPassword ? "••••••••" : undefined}
              required={!overview.hasPassword}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m3u-wizard-token">{t("apiToken")}</Label>
            <Input
              id="m3u-wizard-token"
              name="apiToken"
              type="password"
              placeholder={overview.hasApiToken ? "••••••••" : undefined}
              required={!overview.hasApiToken}
              autoComplete="off"
            />
          </div>
        </div>
        <input type="hidden" name="movieDirectory" value={overview.movieDirectory || "Movies"} />
        <input type="hidden" name="seriesDirectory" value={overview.seriesDirectory || "Series"} />
        <input type="hidden" name="refreshPlaylist" value={overview.refreshPlaylist ? "on" : ""} />
        <input type="hidden" name="refreshJellyfin" value={overview.refreshJellyfin ? "on" : ""} />
        <div className="space-y-2">
          <Label htmlFor="m3u-wizard-playlist">{t("playlist")}</Label>
          <select
            id="m3u-wizard-playlist"
            name="playlistUuid"
            value={playlistUuid}
            onChange={(event) => setPlaylistUuid(event.target.value)}
            disabled={playlists.length === 0 && !playlistUuid}
            className="h-10 w-full rounded-lg border border-input bg-background px-3"
          >
            <option value="" disabled>
              {t("selectPlaylist")}
            </option>
            {playlistUuid && !playlists.some((playlist) => playlist.uuid === playlistUuid) ? (
              <option value={playlistUuid}>{t("selectedPlaylist")}</option>
            ) : null}
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
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">{t("advanced")}</summary>
          <div className="mt-4 space-y-2">
            <Label htmlFor="m3u-wizard-playback-username">{t("playbackUsername")}</Label>
            <Input id="m3u-wizard-playback-username" name="playbackUsername" defaultValue={overview.playbackUsername} />
            <p className="text-xs text-muted-foreground">{t("playbackUsernameHelp")}</p>
          </div>
        </details>
        <WizardTestButton label={t("test")} pendingLabel={t("testing")} />
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
      </fieldset>
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
      {selected
        .filter((id) => !libraries.some((library) => library.id === id))
        .map((id) => (
          <input key={id} type="hidden" name={name} value={id} />
        ))}
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
