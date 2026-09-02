import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const database = vi.hoisted(() => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, set, where };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ db: { update: database.update } }));

import { AiRepository } from "@/server/db/repositories/ai.repository";

describe("AiRepository", () => {
  it("uses explicit PostgreSQL types when recording AI usage", async () => {
    await new AiRepository().recordUsage("openrouter", {
      model: "z-ai/glm-5.3-flash",
      inputTokens: 238,
      outputTokens: 42,
      costUsd: 0.0002,
    });

    const [update] = (
      database.set.mock.calls as unknown as Array<[{ configuration: Parameters<PgDialect["sqlToQuery"]>[0] }]>
    )[0];
    const query = new PgDialect().sqlToQuery(update.configuration);

    expect(query.sql).toContain("'model', $1::text");
    expect(query.sql).toContain("+ $2::bigint");
    expect(query.sql).toContain("+ $3::bigint");
    expect(query.sql).toContain("+ $4::numeric");
    expect(query.sql).toContain("'updatedAt', $5::text");
    expect(query.params).toEqual(["z-ai/glm-5.3-flash", 238, 42, 0.0002, expect.any(String)]);
  });
});
