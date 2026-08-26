import "server-only";
import { env } from "@/env";
import { SecretEncryption } from "./encryption";

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super("Secret encryption is not configured");
    this.name = "EncryptionNotConfiguredError";
  }
}

export function getSecretEncryption(): SecretEncryption {
  if (!env.CUED_ENCRYPTION_KEY) throw new EncryptionNotConfiguredError();
  return new SecretEncryption(env.CUED_ENCRYPTION_KEY);
}
