import "server-only";
import { sql } from "@/server/db/client";
import { AppInfoService } from "./app-info.service";
import { HealthService } from "./health.service";
import { AuthService } from "./auth.service";
import { JellyfinIntegrationService } from "./jellyfin-integration.service";
import { MediaSyncService } from "./media-sync.service";
import { SeriesProgressService } from "./series-progress.service";
import { UserDirectoryService } from "./user-directory.service";
import { authRepository } from "@/server/db/repositories/auth.repository";
import { jellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import { mediaSyncRepository } from "@/server/db/repositories/media-sync.repository";
import { getSecretEncryption } from "@/server/security/secrets";

export const appInfoService = new AppInfoService();
export const healthService = new HealthService(async () => {
  await sql`select 1`;
});

let encryption: ReturnType<typeof getSecretEncryption> | undefined;
try {
  encryption = getSecretEncryption();
} catch {
  encryption = undefined;
}

export const jellyfinIntegrationService = new JellyfinIntegrationService(jellyfinRepository, encryption);
export const authService = encryption ? new AuthService(authRepository, jellyfinRepository, encryption) : undefined;
export const mediaSyncService = encryption ? new MediaSyncService(jellyfinRepository, mediaSyncRepository, encryption) : undefined;
export const seriesProgressService = new SeriesProgressService(mediaSyncRepository);
export const userDirectoryService = new UserDirectoryService(jellyfinRepository, mediaSyncRepository);
