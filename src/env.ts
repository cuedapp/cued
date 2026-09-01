import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  CUED_ENCRYPTION_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, "Must be a base64-encoded 32-byte key")
      .optional(),
  ),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
