export interface JellyfinSyncNotificationCounts {
  [key: string]: number;
  libraries: number;
  items: number;
  users: number;
}

export function serializeJellyfinSyncNotification(counts: JellyfinSyncNotificationCounts) {
  return JSON.stringify(counts);
}

export function parseJellyfinSyncNotification(message: string): JellyfinSyncNotificationCounts | undefined {
  try {
    const parsed: unknown = JSON.parse(message);
    if (!parsed || typeof parsed !== "object") return undefined;
    const value = parsed as Record<string, unknown>;
    const { libraries, items, users } = value;
    if (!isNonNegativeInteger(libraries) || !isNonNegativeInteger(items) || !isNonNegativeInteger(users))
      return undefined;
    return { libraries, items, users };
  } catch {
    return undefined;
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
