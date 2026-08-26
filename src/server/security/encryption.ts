import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";

export class SecretEncryption {
  private readonly key: Buffer;

  constructor(encodedKey: string) {
    this.key = Buffer.from(encodedKey, "base64");
    if (this.key.length !== 32) throw new Error("CUED_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [version, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
  }

  decrypt(payload: string): string {
    const [payloadVersion, encodedIv, encodedTag, encodedCiphertext] = payload.split(".");
    if (payloadVersion !== version || !encodedIv || !encodedTag || encodedCiphertext === undefined) throw new Error("Encrypted secret has an unsupported format");
    try {
      const decipher = createDecipheriv(algorithm, this.key, Buffer.from(encodedIv, "base64url"));
      decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, "base64url")), decipher.final()]).toString("utf8");
    } catch {
      throw new Error("Encrypted secret could not be decrypted");
    }
  }
}
