import { describe, expect, it, vi } from "vitest";
import { TmdbIntegrationService } from "@/server/application/tmdb-integration.service";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type { TmdbProvider } from "@/server/integrations/tmdb/provider";
import { SecretEncryption } from "@/server/security/encryption";

describe("TmdbIntegrationService", () => {
  it("encrypts and verifies a TMDB API Read Access Token", async () => {
    const repository = {
      getIntegration: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: "tmdb", encryptedApiKey: "encrypted", status: "healthy" }),
      saveIntegration: vi.fn().mockResolvedValue({ id: "tmdb" }),
    } as unknown as TmdbRepository;
    const provider = { getConfiguration: vi.fn().mockResolvedValue({ imageSecureBaseUrl: "https://image.tmdb.org/t/p/" }) } as unknown as TmdbProvider;
    const encryption = new SecretEncryption(Buffer.alloc(32, 7).toString("base64"));
    const overview = await new TmdbIntegrationService(repository, encryption, provider).configure("read-token");
    const encrypted = vi.mocked(repository.saveIntegration).mock.calls[0]![0];
    expect(encryption.decrypt(encrypted)).toBe("read-token");
    expect(provider.getConfiguration).toHaveBeenCalledWith("read-token");
    expect(overview).toMatchObject({ configured: true, hasAccessToken: true });
  });

  it("requires encryption before saving a token", async () => {
    const repository = { getIntegration: vi.fn() } as unknown as TmdbRepository;
    await expect(new TmdbIntegrationService(repository).configure("token")).rejects.toThrow("Encryption");
  });
});
