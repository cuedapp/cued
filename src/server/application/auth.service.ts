import { createHash, randomBytes } from "node:crypto";
import type { AuthRepository } from "@/server/db/repositories/auth.repository";
import type { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";
import { JellyfinClient } from "@/server/integrations/jellyfin/client";
import type { MediaServerProvider } from "@/server/integrations/media-server-provider";
import type { SecretEncryption } from "@/server/security/encryption";

export const sessionCookieName = "cued-session";
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jellyfinRepository: JellyfinRepository,
    private readonly encryption: SecretEncryption,
    private readonly clientFactory: (baseUrl: string) => MediaServerProvider = (baseUrl) => new JellyfinClient(baseUrl),
  ) {}

  async login(username: string, password: string) {
    const integration = await this.jellyfinRepository.getIntegration();
    if (!integration) throw new Error("Jellyfin is not configured");
    const authentication = await this.clientFactory(integration.baseUrl).authenticate(username, password);
    if (integration.serverId && authentication.serverId !== integration.serverId)
      throw new Error("Jellyfin server identity changed");
    if (authentication.user.isDisabled) throw new Error("Jellyfin user is disabled");
    const user = await this.authRepository.upsertUser(integration.id, authentication.user);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await this.authRepository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      encryptedAccessToken: this.encryption.encrypt(authentication.accessToken),
      expiresAt,
    });
    return { token, expiresAt, user };
  }

  async getSession(token?: string) {
    return token ? this.authRepository.getSession(hashSessionToken(token)) : undefined;
  }

  async logout(token?: string) {
    if (token) await this.authRepository.deleteSession(hashSessionToken(token));
  }
}
