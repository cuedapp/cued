import postgres, { type Sql } from "postgres";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { fakeJellyfinBaseUrl, fakeProviderBaseUrl } from "./support/constants.mjs";

async function withDatabase<T>(operation: (database: Sql) => Promise<T>): Promise<T> {
  const url = process.env.CUED_E2E_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/cued_e2e") throw new Error("Dedicated E2E database required");
  const database = postgres(url, { max: 1 });
  try {
    return await operation(database);
  } finally {
    await database.end();
  }
}

async function connectJellyfin(page: Page) {
  await page.goto("/en/setup/jellyfin");
  await page.getByRole("textbox", { name: "Jellyfin URL", exact: true }).fill(fakeJellyfinBaseUrl);
  await page.getByLabel("API key", { exact: true }).fill("e2e-jellyfin-api-key");
  await page.getByRole("button", { name: "Load libraries" }).click();
  await expect(page.getByRole("checkbox", { name: /Setup Movies/ })).toBeVisible();
  await page.getByRole("checkbox", { name: /Setup Series/ }).uncheck();
  await page.getByLabel("Automatic scan interval").selectOption("0");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/setup\/tmdb$/);
}

const providerForm = (page: Page, provider: string) =>
  page.locator(`form:has(input[name="provider"][value="${provider}"])`);

test.describe("saving first-run setup", () => {
  test.beforeEach(async () => {
    await withDatabase(async (database) => {
      await database`delete from integrations`;
      await database`delete from installation_bootstrap`;
    });
  });

  test("persists library choices and Off, then saves TMDB despite an imported user", async ({ page }) => {
    await connectJellyfin(page);
    await withDatabase(async (database) => {
      const libraries = await database`select name, selected from media_libraries order by name`;
      expect(libraries).toEqual([
        { name: "Setup Movies", selected: true },
        { name: "Setup Series", selected: false },
      ]);
      await database`insert into users(integration_id, jellyfin_user_id, username, display_name)
        select id, 'imported-setup-user', 'imported-setup-user', 'Setup User' from integrations where provider='jellyfin'`;
    });
    const token = page.getByLabel("API Read Access Token");
    await token.fill("invalid-test-token");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    await expect(token).toHaveValue("invalid-test-token");
    await token.fill("e2e-tmdb-access-token");
    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByRole("status")).toContainText("Connection verified");
    await withDatabase(async (database) =>
      expect(await database`select provider from integrations where provider='tmdb'`).toEqual([]),
    );
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/setup\/acquisition$/);
    await page.goto("/en/setup/jellyfin");
    await expect(page.getByRole("checkbox", { name: /Setup Movies/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Setup Series/ })).not.toBeChecked();
    await expect(page.getByLabel("Automatic scan interval")).toHaveValue("0");
    await page.getByRole("button", { name: "Load libraries" }).click();
    await expect(page.getByRole("button", { name: "Load libraries" })).toBeEnabled();
    await page.reload();
    await expect(page.getByLabel("Automatic scan interval")).toHaveValue("0");
  });

  test("Enter saves both acquisition forms, and failed saves retain discovered ARR choices", async ({ page }) => {
    await page.goto("/en/setup/acquisition");
    for (const provider of ["radarr", "sonarr"]) {
      const form = providerForm(page, provider);
      await form.getByLabel("Server URL").fill(`${fakeProviderBaseUrl}/${provider}`);
      await form.getByLabel("API key", { exact: true }).fill(`e2e-${provider}-api-key`);
    }
    await providerForm(page, "radarr").getByLabel("API key", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/setup\/ai$/);
    await withDatabase(async (database) => {
      const rows = await database`select provider, configuration from integrations order by provider`;
      expect(rows.map((row) => ({ provider: row.provider, searchOnAdd: row.configuration.searchOnAdd }))).toEqual([
        { provider: "radarr", searchOnAdd: true },
        { provider: "sonarr", searchOnAdd: true },
      ]);
    });
    await page.goto("/en/setup/acquisition");
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Radarr", exact: true }) })
      .getByRole("button", { name: "Edit" })
      .click();
    const radarr = providerForm(page, "radarr");
    await radarr.getByRole("button", { name: "Test connection" }).click();
    await radarr.locator('select[name="rootFolderPath"]').selectOption("/e2e/other");
    await radarr.locator('select[name="qualityProfileId"]').selectOption("2");
    await radarr.getByRole("checkbox", { name: "Search immediately" }).uncheck();
    await radarr.getByLabel("API key", { exact: true }).fill("invalid-key");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(radarr.getByRole("alert")).toContainText("could not connect");
    await expect(radarr.locator('select[name="rootFolderPath"]')).toHaveValue("/e2e/other");
    await expect(radarr.locator('select[name="qualityProfileId"]')).toHaveValue("2");
    await expect(radarr.getByRole("checkbox", { name: "Search immediately" })).not.toBeChecked();
    await radarr.getByLabel("API key", { exact: true }).fill("e2e-radarr-api-key");
    await radarr.getByRole("button", { name: "Test connection" }).click();
    await expect(radarr.getByRole("status")).toContainText("Connection verified");
    await expect(radarr.getByRole("checkbox", { name: "Search immediately" })).not.toBeChecked();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/setup\/ai$/);
    await withDatabase(async (database) => {
      const [row] = await database`select configuration from integrations where provider='radarr'`;
      expect(row!.configuration).toMatchObject({
        rootFolderPath: "/e2e/other",
        qualityProfileId: 2,
        searchOnAdd: false,
      });
    });
  });

  test("a rejected provider stays editable while the other touched provider saves", async ({ page }) => {
    await page.goto("/en/setup/acquisition");
    for (const provider of ["radarr", "sonarr"]) {
      const form = providerForm(page, provider);
      await form.getByLabel("Server URL").fill(`${fakeProviderBaseUrl}/${provider}`);
      await form
        .getByLabel("API key", { exact: true })
        .fill(provider === "radarr" ? "invalid-key" : "e2e-sonarr-api-key");
    }
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(providerForm(page, "radarr").getByRole("alert")).toContainText("could not connect");
    await expect(page.getByRole("button", { name: "Save and continue" })).toBeEnabled();
    await expect(page).toHaveURL(/\/setup\/acquisition$/);
    await withDatabase(async (database) =>
      expect(await database`select provider from integrations`).toEqual([{ provider: "sonarr" }]),
    );
  });

  test("M3U setup retains selections, defaults playback to admin, and saves overrides only on Save", async ({
    page,
  }) => {
    await connectJellyfin(page);
    await page.getByRole("button", { name: /Acquisition/ }).click();
    const form = page.locator('form:has(input[name="playbackUsername"])');
    await form.locator('input[name="baseUrl"]').fill(`${fakeProviderBaseUrl}/m3u`);
    await form.locator('input[name="username"]').fill("setup-user");
    await form.locator('input[name="password"]').fill("setup-password");
    await form.locator('input[name="apiToken"]').fill("setup-token");
    await form.locator("summary").click();
    await expect(form.locator('input[name="playbackUsername"]')).toHaveValue("admin");
    await form.locator('input[name="playbackUsername"]').fill("   ");
    await form.getByRole("button", { name: "Test and load playlists" }).click();
    await expect(form.getByRole("status")).toContainText("Connection verified");
    const playlist = form.locator('select[name="playlistUuid"]');
    await playlist.selectOption("22222222-2222-4222-8222-222222222223");
    await form.getByRole("checkbox", { name: "Setup Movies" }).check();
    await expect(playlist).toHaveValue("22222222-2222-4222-8222-222222222223");
    await expect(form.getByRole("status")).toContainText("Connection verified");
    await form.getByRole("button", { name: "Test and load playlists" }).click();
    await expect(form.getByRole("button", { name: "Test and load playlists" })).toBeEnabled();
    await withDatabase(async (database) =>
      expect(await database`select provider from integrations where provider='m3u-editor'`).toEqual([]),
    );
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/setup\/ai$/);
    await withDatabase(async (database) => {
      const [row] = await database`select configuration from integrations where provider='m3u-editor'`;
      const [library] = await database`select id from media_libraries where name='Setup Movies'`;
      expect(row!.configuration).toMatchObject({
        playlistUuid: "22222222-2222-4222-8222-222222222223",
        playbackUsername: "admin",
        movieLibraryIds: [library!.id],
      });
    });
    await page.goto("/en/setup/acquisition");
    await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "M3U Editor", exact: true }) })
      .getByRole("button", { name: "Edit" })
      .click();
    await form.locator("summary").click();
    await form.locator('input[name="playbackUsername"]').fill("not-saved-by-test");
    for (let attempt = 0; attempt < 2; attempt++) {
      await form.getByRole("button", { name: "Test and load playlists" }).click();
      await expect(form.getByRole("button", { name: "Test and load playlists" })).toBeEnabled();
      await expect(page).toHaveURL(/\/setup\/acquisition$/);
    }
    await withDatabase(async (database) => {
      const [row] = await database`select configuration from integrations where provider='m3u-editor'`;
      expect(row!.configuration.playbackUsername).toBe("admin");
    });
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/setup\/ai$/);
    await withDatabase(async (database) => {
      const [row] = await database`select configuration from integrations where provider='m3u-editor'`;
      expect(row!.configuration.playbackUsername).toBe("not-saved-by-test");
    });
  });
});
