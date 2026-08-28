import { describe, expect, it } from "vitest";
import { AppInfoService } from "@/server/application/app-info.service";
import type { JellyfinIntegrationService } from "@/server/application/jellyfin-integration.service";
import type { SeriesProgressService } from "@/server/application/series-progress.service";
import type { TmdbIntegrationService } from "@/server/application/tmdb-integration.service";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import { appRouter } from "@/server/api/root";

describe("tRPC application-service integration", () => {
  it("returns application data through the router without router-owned business logic", async () => {
    const caller = appRouter.createCaller({ requestId: "test-request", services: { appInfo: new AppInfoService(), jellyfinIntegration: {} as JellyfinIntegrationService, seriesProgress: {} as SeriesProgressService, tmdbIntegration: {} as TmdbIntegrationService, tmdbMetadata: {} as TmdbMetadataService } });
    await expect(caller.system.info()).resolves.toEqual({ name: "Cued", milestone: 8, status: "ready" });
  });
});
