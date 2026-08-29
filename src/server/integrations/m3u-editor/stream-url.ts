import type { M3uMediaType } from "./provider";

export function buildM3uEditorStreamUrl(baseUrl: string, type: M3uMediaType, username: string, playlistUuid: string, id: string, extension: string) { return `${baseUrl.replace(/\/+$/, "")}/${type}/${encodeURIComponent(username)}/${encodeURIComponent(playlistUuid)}/${encodeURIComponent(id)}.${encodeURIComponent(extension)}`; }
