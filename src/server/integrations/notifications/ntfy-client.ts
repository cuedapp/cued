import type { NotificationMessage, NotificationProvider } from "./provider";

export class NtfyRequestError extends Error {}

export class NtfyClient implements NotificationProvider {
  async send(connection: { baseUrl: string; token?: string }, notification: NotificationMessage) {
    const response = await fetch(connection.baseUrl.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}),
      },
      body: JSON.stringify({
        topic: notification.topic,
        title: notification.title,
        message: notification.message,
        click: notification.clickUrl,
        tags: notification.tags,
        priority: notification.priority,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new NtfyRequestError(`ntfy returned ${response.status}`);
  }
}
