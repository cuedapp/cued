import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

describe("environment validation", () => {
  it("accepts the minimal bootstrap configuration", () => {
    expect(parseEnv({ DATABASE_URL: "postgresql://cued:secret@db:5432/cued" })).toMatchObject({ LOG_LEVEL: "info", NODE_ENV: "development" });
  });

  it("rejects a missing or non-PostgreSQL database URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "https://example.com" })).toThrow("Invalid environment configuration");
  });
});
