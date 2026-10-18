import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getCurrentUser: vi.fn(), hasCompletedFirstLogin: vi.fn() }));
const tmdb = vi.hoisted(() => ({ testConfiguration: vi.fn(), configure: vi.fn() }));
const m3u = vi.hoisted(() => ({ testConfiguration: vi.fn(), configure: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => session);
vi.mock("@/server/application/services", () => ({
  aiIntegrationService: {},
  jellyfinIntegrationService: {},
  m3uEditorIntegrationService: m3u,
  notificationService: {},
  radarrIntegrationService: {},
  sonarrIntegrationService: {},
  tmdbIntegrationService: tmdb,
}));
vi.mock("@/server/integrations/ai/openrouter-client", () => ({ OpenRouterRequestError: class extends Error {} }));

import { updateM3uEditorConfigurationWizard, updateTmdbConfigurationWizard } from "./wizard-actions";

function form() {
  const data = new FormData();
  data.set("locale", "en");
  data.set("accessToken", "token");
  data.set("intent", "save");
  return data;
}

describe("setup wizard access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("runs without a session until someone has signed in, even when users were already imported", async () => {
    session.hasCompletedFirstLogin.mockResolvedValue(false);
    tmdb.testConfiguration.mockResolvedValue(undefined);
    tmdb.configure.mockResolvedValue(undefined);

    await expect(updateTmdbConfigurationWizard({}, form())).resolves.toEqual({ ok: true });

    expect(tmdb.configure).toHaveBeenCalledWith("token");
  });

  it("requires an administrator session once someone has signed in", async () => {
    session.hasCompletedFirstLogin.mockResolvedValue(true);
    session.getCurrentUser.mockResolvedValue({ id: "viewer", role: "user" });

    await expect(updateTmdbConfigurationWizard({}, form())).rejects.toThrow("Administrator access required");

    expect(tmdb.configure).not.toHaveBeenCalled();
  });

  it("allows an administrator session once someone has signed in", async () => {
    session.hasCompletedFirstLogin.mockResolvedValue(true);
    session.getCurrentUser.mockResolvedValue({ id: "admin", role: "admin" });
    tmdb.testConfiguration.mockResolvedValue(undefined);
    tmdb.configure.mockResolvedValue(undefined);

    await expect(updateTmdbConfigurationWizard({}, form())).resolves.toEqual({ ok: true });
  });
});

describe("M3U wizard intent", () => {
  function m3uForm(intent: "test" | "save", withPlaylist: boolean) {
    const data = new FormData();
    for (const [key, value] of Object.entries({
      locale: "en",
      baseUrl: "http://m3u.example.test",
      username: "user",
      playbackUsername: "playback",
      password: "secret",
      apiToken: "token",
      movieDirectory: "Movies",
      seriesDirectory: "Series",
      intent,
      ...(withPlaylist ? { playlistUuid: "22222222-2222-4222-8222-222222222222" } : {}),
    }))
      data.set(key, value);
    return data;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    session.hasCompletedFirstLogin.mockResolvedValue(false);
    m3u.testConfiguration.mockResolvedValue([{ uuid: "22222222-2222-4222-8222-222222222222", name: "Playlist" }]);
  });

  it("does not save while testing a previously selected playlist", async () => {
    const result = await updateM3uEditorConfigurationWizard({}, m3uForm("test", true));
    expect(result).toEqual({
      tested: true,
      playlists: [{ uuid: "22222222-2222-4222-8222-222222222222", name: "Playlist" }],
    });
    expect(m3u.configure).not.toHaveBeenCalled();
  });

  it("rejects an incomplete save instead of returning another discovery result", async () => {
    expect(await updateM3uEditorConfigurationWizard({}, m3uForm("save", false))).toEqual({ error: "invalid" });
    expect(m3u.configure).not.toHaveBeenCalled();
  });
});
