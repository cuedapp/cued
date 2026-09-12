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
  contentRating?: string;
  externalIds?: Record<string, string>;
  userData?: MediaUserData;
  raw: Record<string, unknown>;
}

export interface MediaServerCollection {
  id: string;
  name: string;
  externalIds?: Record<string, string>;
  itemIds: string[];
  raw: Record<string, unknown>;
}

export interface MediaServerSession {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  itemKind: "movie" | "series" | "season" | "episode";
  seriesName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  positionTicks?: string;
  runtimeTicks?: string;
  deviceName?: string;
  clientName?: string;
  playMethod?: string;
  videoCodec?: string;
  videoBitRate?: number;
}

export interface MediaServerProvider {
  getPublicInfo(): Promise<MediaServerInfo>;
  testConnection(apiKey?: string): Promise<MediaServerInfo>;
  authenticate(username: string, password: string): Promise<MediaServerAuthentication>;
  getLibraries(apiKey: string): Promise<MediaLibrary[]>;
  getUsers(apiKey: string): Promise<MediaServerUser[]>;
  getUserAvatar(apiKey: string, userId: string, tag?: string): Promise<MediaServerImage | undefined>;
  getItemImage(apiKey: string, itemId: string): Promise<MediaServerImage | undefined>;
  getActiveSessions(apiKey: string): Promise<MediaServerSession[]>;
  getItems(
    apiKey: string,
    options?: {
      userId?: string;
      parentId?: string;
      externalId?: { provider: string; id: string };
      minDateLastSaved?: Date;
    },
  ): Promise<MediaServerItem[]>;
  getCollections(apiKey: string): Promise<MediaServerCollection[]>;
  refreshLibrary(apiKey: string): Promise<void>;
}
