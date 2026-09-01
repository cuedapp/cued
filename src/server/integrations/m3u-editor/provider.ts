export type M3uMediaType = "movie" | "series";
export interface M3uEditorTitle {
  type: M3uMediaType;
  tmdbId: number;
  externalId: string;
  title: string;
  groupName?: string;
  containerExtension?: string;
}
export interface M3uEditorEpisode {
  externalId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  containerExtension: string;
}
export interface M3uEditorPlaylist {
  uuid: string;
  name: string;
}
export interface M3uEditorConnection {
  baseUrl: string;
  username: string;
  password: string;
}
export interface M3uEditorProvider {
  authenticate(connection: M3uEditorConnection): Promise<void>;
  getPlaylists(baseUrl: string, apiToken: string): Promise<M3uEditorPlaylist[]>;
  getTitles(connection: M3uEditorConnection): Promise<M3uEditorTitle[]>;
  getSeriesEpisodes(connection: M3uEditorConnection, seriesId: string): Promise<M3uEditorEpisode[]>;
  refreshPlaylist(baseUrl: string, playlistUuid: string, apiToken: string): Promise<void>;
}
