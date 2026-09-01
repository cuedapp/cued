import { describe, expect, it, vi } from "vitest";
import { JellyfinIntegrationService } from "@/server/application/jellyfin-integration.service";
import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import { SecretEncryption } from "@/server/security/encryption";

describe("JellyfinIntegrationService", () => {
  it("allows URL setup before an API key is available", async () => {
    const repository = {
      getIntegration: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({
        id: "integration",
        baseUrl: "http://jellyfin:8096",
        encryptedApiKey: null,
        status: "healthy",
      }),
      saveIntegration: vi.fn().mockResolvedValue({ id: "integration" }),
      getLibraries: vi.fn().mockResolvedValue([]),
      syncLibraries: vi.fn(),
    } as unknown as JellyfinRepository;
    const provider = {
      testConnection: vi.fn().mockResolvedValue({ id: "server", name: "Home", version: "10.10.0" }),
    } as unknown as MediaServerProvider;
    const overview = await new JellyfinIntegrationService(repository, undefined, () => provider).configure({
      baseUrl: "http://jellyfin:8096/",
    });
    expect(repository.saveIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://jellyfin:8096", serverId: "server" }),
    );
    expect(repository.syncLibraries).not.toHaveBeenCalled();
    expect(overview).toMatchObject({ configured: true, hasApiKey: false });
  });

  it("encrypts an API key and discovers libraries", async () => {
    const repository = {
      getIntegration: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({
        id: "integration",
        baseUrl: "http://jellyfin:8096",
        encryptedApiKey: "stored",
        status: "healthy",
      }),
      saveIntegration: vi.fn().mockResolvedValue({ id: "integration" }),
      getLibraries: vi.fn().mockResolvedValue([]),
      syncLibraries: vi.fn(),
    } as unknown as JellyfinRepository;
    const provider = {
      testConnection: vi.fn().mockResolvedValue({ id: "server", name: "Home", version: "10.10.0" }),
      getLibraries: vi.fn().mockResolvedValue([{ id: "movies", name: "Movies", collectionType: "movies" }]),
    } as unknown as MediaServerProvider;
    const encryption = new SecretEncryption(Buffer.alloc(32, 5).toString("base64"));
    await new JellyfinIntegrationService(repository, encryption, () => provider).configure({
      baseUrl: "http://jellyfin:8096",
      apiKey: "api-key",
    });
    const saved = vi.mocked(repository.saveIntegration).mock.calls[0]![0];
    expect(encryption.decrypt(saved.encryptedApiKey!)).toBe("api-key");
    expect(repository.syncLibraries).toHaveBeenCalledWith("integration", [
      { id: "movies", name: "Movies", collectionType: "movies" },
    ]);
  });
});
