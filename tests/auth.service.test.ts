import { describe, expect, it, vi } from "vitest";
import { AuthService } from "@/server/application/auth.service";
import type { AuthRepository } from "@/server/db/repositories/auth.repository";
import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import { SecretEncryption } from "@/server/security/encryption";

describe("AuthService", () => {
  it("maps an authenticated Jellyfin user and encrypts the access token", async () => {
    const createdSession = vi.fn();
    const authRepository = {
      upsertUser: vi.fn().mockResolvedValue({ id: "local-user", role: "admin" }),
      createSession: createdSession,
    } as unknown as AuthRepository;
    const jellyfinRepository = { getIntegration: vi.fn().mockResolvedValue({ id: "integration", baseUrl: "http://jellyfin:8096", serverId: "server" }) } as unknown as JellyfinRepository;
    const provider = { authenticate: vi.fn().mockResolvedValue({
      serverId: "server",
      accessToken: "jellyfin-user-token",
      user: { id: "jellyfin-user", username: "Erik", isAdministrator: true, isDisabled: false, hasAccessToAllLibraries: true, enabledLibraryIds: [] },
    }) } as unknown as MediaServerProvider;
    const encryption = new SecretEncryption(Buffer.alloc(32, 4).toString("base64"));
    const result = await new AuthService(authRepository, jellyfinRepository, encryption, () => provider).login("Erik", "password");
    expect(provider.authenticate).toHaveBeenCalledWith("Erik", "password");
    expect(authRepository.upsertUser).toHaveBeenCalledWith("integration", expect.objectContaining({ id: "jellyfin-user", isAdministrator: true }));
    const session = createdSession.mock.calls[0]![0];
    expect(encryption.decrypt(session.encryptedAccessToken)).toBe("jellyfin-user-token");
    expect(session).not.toHaveProperty("password");
    expect(result.token).toHaveLength(43);
  });

  it("rejects authentication from a different Jellyfin server", async () => {
    const authRepository = { upsertUser: vi.fn(), createSession: vi.fn() } as unknown as AuthRepository;
    const jellyfinRepository = { getIntegration: vi.fn().mockResolvedValue({ id: "integration", baseUrl: "http://jellyfin:8096", serverId: "expected" }) } as unknown as JellyfinRepository;
    const provider = { authenticate: vi.fn().mockResolvedValue({ serverId: "other", accessToken: "token", user: { id: "user", username: "User", isAdministrator: false, isDisabled: false, hasAccessToAllLibraries: true, enabledLibraryIds: [] } }) } as unknown as MediaServerProvider;
    const service = new AuthService(authRepository, jellyfinRepository, new SecretEncryption(Buffer.alloc(32, 4).toString("base64")), () => provider);
    await expect(service.login("User", "password")).rejects.toThrow("server identity changed");
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });
});
