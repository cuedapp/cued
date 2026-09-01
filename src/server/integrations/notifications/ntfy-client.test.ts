import { afterEach, describe, expect, it, vi } from "vitest";
import { NtfyClient, NtfyRequestError } from "./ntfy-client";

describe("NtfyClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("publishes the JSON message with bearer authentication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await new NtfyClient().send(
      { baseUrl: "https://ntfy.example/", token: "secret" },
      {
        topic: "cued-user",
        title: "New season",
        message: "Silo has a new season.",
        clickUrl: "/following",
        tags: ["tv"],
      },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ntfy.example",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer secret" }) }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({
      topic: "cued-user",
      title: "New season",
      click: "/following",
      tags: ["tv"],
    });
  });

  it("surfaces unsuccessful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 403 })));
    await expect(
      new NtfyClient().send({ baseUrl: "https://ntfy.example" }, { topic: "cued", title: "Test", message: "Test" }),
    ).rejects.toBeInstanceOf(NtfyRequestError);
  });
});
