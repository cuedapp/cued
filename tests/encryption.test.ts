import { describe, expect, it } from "vitest";
import { SecretEncryption } from "@/server/security/encryption";

describe("SecretEncryption", () => {
  const firstKey = Buffer.alloc(32, 1).toString("base64");
  const secondKey = Buffer.alloc(32, 2).toString("base64");

  it("encrypts and decrypts secrets without exposing plaintext", () => {
    const encryption = new SecretEncryption(firstKey);
    const encrypted = encryption.encrypt("jellyfin-api-key");
    expect(encrypted).not.toContain("jellyfin-api-key");
    expect(encryption.decrypt(encrypted)).toBe("jellyfin-api-key");
  });

  it("rejects tampered data and a different key", () => {
    const encrypted = new SecretEncryption(firstKey).encrypt("secret");
    const parts = encrypted.split(".");
    parts[3] = `${parts[3]?.startsWith("A") ? "B" : "A"}${parts[3]?.slice(1)}`;
    expect(() => new SecretEncryption(secondKey).decrypt(encrypted)).toThrow("could not be decrypted");
    expect(() => new SecretEncryption(firstKey).decrypt(parts.join("."))).toThrow("could not be decrypted");
  });
});
