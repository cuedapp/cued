export type ArrKind = "radarr" | "sonarr";

export interface ArrConnection {
  baseUrl: string;
  apiKey: string;
}

export interface ArrSystemStatus { instanceName: string; version: string }
export interface ArrRootFolder { id: number; path: string; freeSpace?: number }
export interface ArrQualityProfile { id: number; name: string }
export interface ArrTag { id: number; label: string }
export interface ArrTitle { id?: number; tmdbId: number; title: string; year?: number; raw: Record<string, unknown> }

export interface ArrProvider {
  readonly kind: ArrKind;
  getStatus(connection: ArrConnection): Promise<ArrSystemStatus>;
  getRootFolders(connection: ArrConnection): Promise<ArrRootFolder[]>;
  getQualityProfiles(connection: ArrConnection): Promise<ArrQualityProfile[]>;
  getTags(connection: ArrConnection): Promise<ArrTag[]>;
  getExistingTmdbIds(connection: ArrConnection): Promise<number[]>;
  lookup(connection: ArrConnection, tmdbId: number): Promise<ArrTitle | undefined>;
  add(connection: ArrConnection, title: ArrTitle, options: { rootFolderPath: string; qualityProfileId: number; tagIds?: number[]; searchOnAdd?: boolean; seriesMonitor?: string }): Promise<ArrTitle>;
}
