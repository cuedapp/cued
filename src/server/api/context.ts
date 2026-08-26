import { appInfoService, jellyfinIntegrationService, mediaSyncService, seriesProgressService, tmdbIntegrationService, tmdbMetadataService } from "@/server/application/services";
import type { AppInfoService } from "@/server/application/app-info.service";
import type { JellyfinIntegrationService } from "@/server/application/jellyfin-integration.service";
import type { MediaSyncService } from "@/server/application/media-sync.service";
import type { SeriesProgressService } from "@/server/application/series-progress.service";
import type { TmdbIntegrationService } from "@/server/application/tmdb-integration.service";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { User } from "@/server/db/schema";
import { authService } from "@/server/application/services";
import { sessionCookieName } from "@/server/application/auth.service";

export interface TrpcContext {
  requestId: string;
  user?: User;
  services: { appInfo: AppInfoService; jellyfinIntegration: JellyfinIntegrationService; mediaSync?: MediaSyncService; seriesProgress: SeriesProgressService; tmdbIntegration: TmdbIntegrationService; tmdbMetadata: TmdbMetadataService };
}

const defaultServices = { appInfo: appInfoService, jellyfinIntegration: jellyfinIntegrationService, mediaSync: mediaSyncService, seriesProgress: seriesProgressService, tmdbIntegration: tmdbIntegrationService, tmdbMetadata: tmdbMetadataService };

export function createTrpcContext(requestId = crypto.randomUUID(), services = defaultServices, user?: User): TrpcContext {
  return { requestId, services, user };
}

export async function createTrpcRequestContext(request: Request) {
  const cookies = request.headers.get("cookie")?.split(";").map((value) => value.trim()) ?? [];
  const token = cookies.find((value) => value.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length + 1);
  const session = await authService?.getSession(token);
  return createTrpcContext(request.headers.get("x-request-id") ?? undefined, defaultServices, session?.user);
}
