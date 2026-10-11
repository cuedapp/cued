import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getCurrentUser: vi.fn(), hasSignedInUsers: vi.fn() }));
const tmdb = vi.hoisted(() => ({ testConfiguration: vi.fn(), configure: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => session);
vi.mock("@/server/application/services", () => ({
  aiIntegrationService: {},
  jellyfinIntegrationService: {},
  m3uEditorIntegrationService: {},
  notificationService: {},
  radarrIntegrationService: {},
  sonarrIntegrationService: {},
  tmdbIntegrationService: tmdb,
}));
vi.mock("@/server/integrations/ai/openrouter-client", () => ({ OpenRouterRequestError: class extends Error {} }));

import { updateTmdbConfigurationWizard } from "./wizard-actions";

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
    session.hasSignedInUsers.mockResolvedValue(false);
    tmdb.testConfiguration.mockResolvedValue(undefined);
    tmdb.configure.mockResolvedValue(undefined);

    await expect(updateTmdbConfigurationWizard({}, form())).resolves.toEqual({ ok: true });

    expect(tmdb.configure).toHaveBeenCalledWith("token");
    expect(session.getCurrentUser).not.toHaveBeenCalled();
  });

  it("requires an administrator session once someone has signed in", async () => {
    session.hasSignedInUsers.mockResolvedValue(true);
    session.getCurrentUser.mockResolvedValue({ id: "viewer", role: "user" });

    await expect(updateTmdbConfigurationWizard({}, form())).rejects.toThrow("Administrator access required");

    expect(tmdb.configure).not.toHaveBeenCalled();
  });

  it("allows an administrator session once someone has signed in", async () => {
    session.hasSignedInUsers.mockResolvedValue(true);
    session.getCurrentUser.mockResolvedValue({ id: "admin", role: "admin" });
    tmdb.testConfiguration.mockResolvedValue(undefined);
    tmdb.configure.mockResolvedValue(undefined);

    await expect(updateTmdbConfigurationWizard({}, form())).resolves.toEqual({ ok: true });
  });
});
