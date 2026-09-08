import { describe, expect, it } from "vitest";
import { parseJellyfinSyncNotification, serializeJellyfinSyncNotification } from "./jellyfin-sync-notification";

describe("Jellyfin sync notification details", () => {
  it("round-trips completed sync counts", () => {
    const counts = { libraries: 3, items: 42, users: 5 };
    expect(parseJellyfinSyncNotification(serializeJellyfinSyncNotification(counts))).toEqual(counts);
  });

  it("ignores historic or malformed notification messages", () => {
    expect(parseJellyfinSyncNotification("")).toBeUndefined();
    expect(parseJellyfinSyncNotification('{"libraries":1,"items":-2,"users":3}')).toBeUndefined();
  });
});
