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

import { JellyfinRepository } from "@/server/db/repositories/jellyfin.repository";

describe("JellyfinRepository", () => {
  it("serializes a degraded health timestamp before embedding it in SQL", async () => {
    await new JellyfinRepository().setHealth("integration", "degraded", "Connection failed");

    const [values] = (
      database.set.mock.calls as unknown as Array<[{ failureStartedAt: Parameters<PgDialect["sqlToQuery"]>[0] }]>
    )[0]!;
    const query = new PgDialect().sqlToQuery(values.failureStartedAt);

    expect(query.params).toEqual([expect.any(String)]);
  });
});
