import { describe, expect, it, vi } from "vitest";
import { ArrIntegrationService } from "@/server/application/arr-integration.service";
import type { ArrRepository } from "@/server/db/repositories/arr.repository";
import type { ArrProvider } from "@/server/integrations/arr/provider";
import { SecretEncryption } from "@/server/security/encryption";

const encryption = new SecretEncryption(Buffer.alloc(32, 7).toString("base64"));
const provider = {
  kind: "radarr",
  getStatus: vi.fn().mockResolvedValue({ instanceName: "Radarr", version: "6" }),
  getRootFolders: vi.fn().mockResolvedValue([{ id: 1, path: "/movies" }]),
  getQualityProfiles: vi.fn().mockResolvedValue([{ id: 2, name: "HD" }]),
  getTags: vi.fn().mockResolvedValue([]),
  lookup: vi.fn(),
  add: vi.fn(),
} as unknown as ArrProvider;

describe("ArrIntegrationService", () => {
  it("tests unsaved credentials without persisting them", async () => {
    const repository = {
      getIntegration: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    } as unknown as ArrRepository;
    const result = await new ArrIntegrationService(repository, encryption, provider).testConfiguration({
      baseUrl: "http://radarr:7878/",
      apiKey: "key",
    });
    expect(result.rootFolders[0]?.path).toBe("/movies");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("recognizes a title already present in Radarr without adding it again", async () => {
    const integration = {
      id: "integration",
      baseUrl: "http://radarr:7878",
      encryptedApiKey: encryption.encrypt("key"),
      configuration: { rootFolderPath: "/movies", qualityProfileId: 2 },
    };
    const repository = {
      getIntegration: vi.fn().mockResolvedValue(integration),
      setHealth: vi.fn(),
    } as unknown as ArrRepository;
    const existingProvider = {
      ...provider,
      lookup: vi.fn().mockResolvedValue({ id: 5, tmdbId: 10, title: "Movie", raw: {} }),
      add: vi.fn(),
    } as unknown as ArrProvider;
    await expect(
      new ArrIntegrationService(repository, encryption, existingProvider).request(10),
    ).resolves.toMatchObject({ state: "existing" });
    expect(existingProvider.add).not.toHaveBeenCalled();
  });
});
