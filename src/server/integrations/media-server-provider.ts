export interface MediaServerInfo {
  id: string;
  name: string;
  version: string;
}

export interface MediaServerUser {
  id: string;
  username: string;
  primaryImageTag?: string;
  isAdministrator: boolean;
  isDisabled: boolean;
  hasAccessToAllLibraries: boolean;
  enabledLibraryIds: string[];
}

export interface MediaServerImage {
  body: ArrayBuffer;
  contentType: string;
  etag?: string;
}

export interface MediaServerAuthentication {
  serverId: string;
  accessToken: string;
  user: MediaServerUser;
}

export interface MediaLibrary {
  id: string;
  name: string;
  collectionType?: string;
}

export interface MediaUserData {
  played: boolean;
  playCount: number;
  playedPercentage?: number;
  playbackPositionTicks?: string;
  lastPlayedAt?: Date;
}

export interface MediaServerItem {
  id: string;
  name: string;
  kind: "movie" | "series" | "season" | "episode";
  libraryId?: string;
  seriesId?: string;
  seasonId?: string;
  parentId?: string;
  premiereDate?: Date;
  runtimeTicks?: string;
  externalIds?: Record<string, string>;
  userData?: MediaUserData;
  raw: Record<string, unknown>;
}

export interface MediaServerProvider {
  getPublicInfo(): Promise<MediaServerInfo>;
  testConnection(apiKey?: string): Promise<MediaServerInfo>;
  authenticate(username: string, password: string): Promise<MediaServerAuthentication>;
  getLibraries(apiKey: string): Promise<MediaLibrary[]>;
  getUsers(apiKey: string): Promise<MediaServerUser[]>;
  getUserAvatar(apiKey: string, userId: string, tag?: string): Promise<MediaServerImage | undefined>;
  getItems(apiKey: string, options?: { userId?: string; parentId?: string; minDateLastSaved?: Date; minDateLastSavedForUser?: Date }): Promise<MediaServerItem[]>;
}
