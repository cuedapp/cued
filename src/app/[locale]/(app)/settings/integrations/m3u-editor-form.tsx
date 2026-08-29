"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FormSubmitButton } from "@/components/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { syncM3uEditor, updateM3uEditorConfiguration, type M3uEditorFormState } from "./actions";

type Library = { id: string; name: string; collectionType: string | null };
type Playlist = { uuid: string; name: string };

export function M3uEditorForm({ locale, overview }: { locale: string; overview: { baseUrl: string; username: string; playbackUsername: string; playlistUuid: string; playlists: Playlist[]; movieDirectory: string; seriesDirectory: string; refreshPlaylist: boolean; refreshJellyfin: boolean; hasPassword: boolean; hasApiToken: boolean; encryptionConfigured: boolean; movieLibraryIds: string[]; seriesLibraryIds: string[]; libraries: Library[]; configured: boolean } }) {
  const t = useTranslations("M3uEditorIntegration");
  const [state, action] = useActionState(updateM3uEditorConfiguration, {} as M3uEditorFormState);
  const [syncState, syncAction] = useActionState(syncM3uEditor, {} as M3uEditorFormState);
  const [baseUrl, setBaseUrl] = useState(overview.baseUrl);
  const [username, setUsername] = useState(overview.username);
  const [playbackUsername, setPlaybackUsername] = useState(overview.playbackUsername);
  const [password, setPassword] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [storedPlaylists] = useState<Playlist[]>(overview.playlists.length ? overview.playlists : overview.playlistUuid ? [{ uuid: overview.playlistUuid, name: t("selectedPlaylist") }] : []);
  const [playlistUuid, setPlaylistUuid] = useState(overview.playlistUuid);
  const [movieDirectory, setMovieDirectory] = useState(overview.movieDirectory);
  const [seriesDirectory, setSeriesDirectory] = useState(overview.seriesDirectory);
  const [movieLibraryIds, setMovieLibraryIds] = useState(overview.movieLibraryIds);
  const [seriesLibraryIds, setSeriesLibraryIds] = useState(overview.seriesLibraryIds);

  useEffect(() => {
    const current = state.error ? state : syncState;
    if (current.error) toast.error(t(`errors.${current.error}`));
    if (current.result) toast.success(t(`results.${current.result}`));
  }, [state, syncState, t]);

  const playlists = state.playlists ?? storedPlaylists;
  const selectedPlaylistUuid = playlists.some((playlist) => playlist.uuid === playlistUuid) ? playlistUuid : "";

  return <div className="space-y-6"><form action={action} className="space-y-5"><input type="hidden" name="locale" value={locale} />
    <div className="space-y-4 rounded-xl border border-border p-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="m3uBaseUrl">{t("baseUrl")}</Label><Input id="m3uBaseUrl" name="baseUrl" type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="m3uUsername">{t("username")}</Label><Input id="m3uUsername" name="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div></div>
      <div className="space-y-2"><Label htmlFor="m3uPassword">{t("password")}</Label><Input id="m3uPassword" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={overview.hasPassword ? t("passwordStored") : undefined} disabled={!overview.encryptionConfigured} required={!overview.hasPassword} autoComplete="off" /><p className="text-xs text-muted-foreground">{t("passwordHelp")}</p></div>
      <div className="space-y-2"><Label htmlFor="m3uApiToken">{t("apiToken")}</Label><Input id="m3uApiToken" name="apiToken" type="password" value={apiToken} onChange={(event) => setApiToken(event.target.value)} placeholder={overview.hasApiToken ? t("apiTokenStored") : undefined} disabled={!overview.encryptionConfigured} required={!overview.hasApiToken} autoComplete="off" /><p className="text-xs leading-5 text-muted-foreground">{t("apiTokenHelp")}</p></div>
      <FormSubmitButton name="intent" value="test" variant="outline" pendingLabel={t("testing")}>{t("test")}</FormSubmitButton></div>
    <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="space-y-2"><Label htmlFor="m3uPlaylistUuid">{t("playlist")}</Label><select id="m3uPlaylistUuid" name="playlistUuid" value={selectedPlaylistUuid} onChange={(event) => setPlaylistUuid(event.target.value)} disabled={playlists.length === 0} required className="h-11 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"><option value="" disabled>{t("selectPlaylist")}</option>{playlists.map((playlist) => <option key={playlist.uuid} value={playlist.uuid}>{playlist.name}</option>)}</select><p className="text-xs leading-5 text-muted-foreground">{t("playlistHelp")}</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="m3uMovieDirectory">{t("movieDirectory")}</Label><Input id="m3uMovieDirectory" name="movieDirectory" value={movieDirectory} onChange={(event) => setMovieDirectory(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="m3uSeriesDirectory">{t("seriesDirectory")}</Label><Input id="m3uSeriesDirectory" name="seriesDirectory" value={seriesDirectory} onChange={(event) => setSeriesDirectory(event.target.value)} required /></div></div><p className="text-xs text-muted-foreground">{t("directoryHelp")}</p>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" name="refreshPlaylist" defaultChecked={overview.refreshPlaylist} className="mt-1 size-4 cursor-pointer accent-primary" /><span><span className="block text-sm font-medium">{t("refreshPlaylist")}</span><span className="text-xs leading-5 text-muted-foreground">{t("refreshPlaylistHelp")}</span></span></label>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" name="refreshJellyfin" defaultChecked={overview.refreshJellyfin} className="mt-1 size-4 cursor-pointer accent-primary" /><span><span className="block text-sm font-medium">{t("refreshJellyfin")}</span><span className="text-xs leading-5 text-muted-foreground">{t("refreshJellyfinHelp")}</span></span></label>
    <LibraryAccess title={t("movieLibraries")} help={t("movieLibrariesHelp")} name="movieLibraryIds" libraries={overview.libraries} selected={movieLibraryIds} onChange={setMovieLibraryIds} /><LibraryAccess title={t("seriesLibraries")} help={t("seriesLibrariesHelp")} name="seriesLibraryIds" libraries={overview.libraries} selected={seriesLibraryIds} onChange={setSeriesLibraryIds} />
    <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">{t("advanced")}</summary><div className="mt-4 space-y-2"><Label htmlFor="m3uPlaybackUsername">{t("playbackUsername")}</Label><Input id="m3uPlaybackUsername" name="playbackUsername" value={playbackUsername} onChange={(event) => setPlaybackUsername(event.target.value)} required /><p className="text-xs leading-5 text-muted-foreground">{t("playbackUsernameHelp")}</p></div></details>
    <FormSubmitButton name="intent" value="save" pendingLabel={t("saving")} disabled={!selectedPlaylistUuid}>{t("save")}</FormSubmitButton>
  </form>{overview.configured && <form action={syncAction}><input type="hidden" name="locale" value={locale} /><FormSubmitButton variant="outline" pendingLabel={t("syncing")}>{t("sync")}</FormSubmitButton></form>}</div>;
}

function LibraryAccess({ title, help, name, libraries, selected, onChange }: { title: string; help: string; name: string; libraries: Library[]; selected: string[]; onChange: (ids: string[]) => void }) { return <fieldset className="space-y-3"><legend className="text-sm font-medium">{title}</legend><p className="text-xs text-muted-foreground">{help}</p><div className="grid gap-2 sm:grid-cols-2">{libraries.map((library) => <label key={library.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" name={name} value={library.id} checked={selected.includes(library.id)} onChange={(event) => onChange(event.target.checked ? [...selected, library.id] : selected.filter((id) => id !== library.id))} className="size-4 cursor-pointer accent-primary" />{library.name}</label>)}</div></fieldset>; }
