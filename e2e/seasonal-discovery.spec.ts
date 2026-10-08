import postgres from "postgres";
import { SecretEncryption } from "@/server/security/encryption";
import { expect, test } from "./fixtures";
import { e2eDatabaseName, e2eEncryptionKey, fakeProviderBaseUrl, fakeUser } from "./support/constants.mjs";

const title = "E2E Seasonal Fixture";

test("users save seasonal themes in settings and browse theme-scoped feeds with filters and Show more", async ({
  page,
}) => {
  const formattingErrors: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("FORMATTING_ERROR")) formattingErrors.push(message.text());
  });
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(fakeUser.username);
  await page.getByLabel("Password").fill(fakeUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);

  await page.goto("/en/settings");
  const halloween = page.locator('input[name="theme"][value="halloween"]');
  await halloween.check();
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/settings")),
    page.getByRole("button", { name: "Save themes", exact: true }).click(),
  ]);
  await page.reload();
  await expect(halloween).toBeChecked();

  await page.goto("/en/seasonal");
  const seasonal = page.getByRole("region", { name: "Seasonal titles" });
  await expect(seasonal.getByLabel("Browse theme")).toHaveValue("halloween");
  await expect(page.getByRole("button", { name: "Save themes", exact: true })).toHaveCount(0);
  await expect(seasonal.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const firstResult = seasonal
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const follow = firstResult.getByRole("button", { name: "Follow", exact: true });
  await expect(follow).toHaveText("");
  await expect(follow.locator("svg")).toBeVisible();
  await follow.click();
  await expect(firstResult.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();
  await page.reload();
  await expect(firstResult.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();

  await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(seasonal.getByRole("heading", { name: "E2E More Seasonal", exact: true })).toBeVisible();
  await expect(seasonal.getByRole("heading", { name: title, exact: true })).toHaveCount(1);
  await expect(seasonal.getByRole("button", { name: "Show more", exact: true })).toHaveCount(0);

  await seasonal.getByRole("button", { name: /Filter & Sort/ }).click();
  await seasonal.getByRole("combobox", { name: "Library", exact: true }).selectOption("in");
  await seasonal.getByRole("combobox", { name: "Availability", exact: true }).selectOption("jellyfin");
  await seasonal.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(
    seasonal.getByText("No titles match these filters. Try another theme or filter combination."),
  ).toBeVisible();
  await seasonal.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(seasonal.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(seasonal.getByRole("heading", { name: "E2E More Seasonal", exact: true })).toHaveCount(0);

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/seasonal?") && response.url().includes("scope=trending"),
    ),
    seasonal.getByRole("tab", { name: "Trending", exact: true }).click(),
  ]);
  await expect(seasonal.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(seasonal.getByRole("heading", { name: "E2E Unrelated Trending", exact: true })).toHaveCount(0);
  await seasonal.getByRole("tab", { name: "Upcoming", exact: true }).click();
  await expect(seasonal.getByRole("heading", { name: "E2E Upcoming Seasonal", exact: true })).toBeVisible();
  await expect(seasonal.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
  await expect(seasonal.getByText("Premieres 2099-10-01", { exact: true })).toBeVisible();
  await page.reload();
  await expect(seasonal.getByRole("tab", { name: "Upcoming", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(seasonal.getByRole("heading", { name: "E2E Upcoming Seasonal", exact: true })).toBeVisible();

  await seasonal.getByLabel("Browse theme").selectOption("christmas");
  await expect(seasonal.getByLabel("Browse theme")).toHaveValue("christmas");
  await page.goto("/en/");
  const picks = page.getByRole("region", { name: "Your seasonal picks", exact: true });
  await expect(picks.getByText(/Halloween/)).toBeVisible();
  const dashboardCard = picks
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(dashboardCard.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/en")),
    dashboardCard.getByRole("button", { name: "More like this", exact: true }).click(),
  ]);
  await expect(dashboardCard.getByRole("button", { name: "Remove positive feedback", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(dashboardCard.getByRole("button", { name: "Remove positive feedback", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dashboardCard.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(dashboardCard.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  await page.reload();
  await expect(dashboardCard.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
  await dashboardCard.getByRole("heading", { name: title, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/title\/movie\/424244$/);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto("/en/settings");
  await halloween.uncheck();
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/settings")),
    page.getByRole("button", { name: "Save themes", exact: true }).click(),
  ]);
  await page.reload();
  await expect(halloween).not.toBeChecked();
  await page.goto("/en/");
  await expect(page.getByRole("region", { name: "Your seasonal picks", exact: true })).toHaveCount(0);
  expect(formattingErrors).toEqual([]);
});

test("seasonal genre and rating filters search beyond the first page and sorting survives Show more and reload", async ({
  page,
}) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(fakeUser.username);
  await page.getByLabel("Password").fill(fakeUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await page.goto("/en/seasonal?theme=halloween&type=movie");
  const seasonal = page.getByRole("region", { name: "Seasonal titles" });
  const titles = seasonal.getByRole("article").getByRole("heading", { level: 2 });
  await expect(titles).toHaveText([title]);
  await seasonal.getByRole("button", { name: /Filter & Sort/ }).click();
  const sort = seasonal.getByRole("combobox", { name: "Sort", exact: true });
  const genre = seasonal.getByRole("combobox", { name: "Genre", exact: true });
  const rating = seasonal.getByRole("combobox", { name: "Rating", exact: true });
  const apply = seasonal.getByRole("button", { name: "Apply filters", exact: true });
  await expect(genre.getByRole("option", { name: "Comedy", exact: true })).toBeAttached();
  await sort.selectOption("rating");
  await apply.click();
  await expect(titles).toHaveText(["E2E More Seasonal"]);
  await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(titles).toHaveText(["E2E More Seasonal", title]);
  await page.reload();
  await seasonal.getByRole("button", { name: /Filter & Sort/ }).click();
  await expect(sort).toHaveValue("rating");
  await expect(titles).toHaveText(["E2E More Seasonal"]);
  await sort.selectOption("releaseAsc");
  await apply.click();
  await expect(titles).toHaveText(["E2E More Seasonal"]);
  await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(titles).toHaveText(["E2E More Seasonal", title]);
  await sort.selectOption("releaseDesc");
  await apply.click();
  await expect(titles).toHaveText([title]);
  await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
  await expect(titles).toHaveText([title, "E2E More Seasonal"]);
  await genre.selectOption("35");
  await rating.selectOption("8");
  await apply.click();
  await expect(titles).toHaveText(["E2E More Seasonal"]);
  await expect(seasonal.getByRole("button", { name: "Show more", exact: true })).toHaveCount(0);
  await page.reload();
  await seasonal.getByRole("button", { name: /Filter & Sort/ }).click();
  await expect(genre).toHaveValue("35");
  await expect(rating).toHaveValue("8");
  await expect(titles).toHaveText(["E2E More Seasonal"]);
  await genre.selectOption("27");
  await apply.click();
  await expect(
    seasonal.getByText("No titles match these filters. Try another theme or filter combination."),
  ).toBeVisible();
  await seasonal.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(titles).toHaveText([title]);
  await expect(genre).toHaveValue("all");
  await expect(rating).toHaveValue("all");
  await expect(sort).toHaveValue("feed");
  await expect(seasonal.getByLabel("Browse theme")).toHaveValue("halloween");
  await expect(seasonal.getByRole("tab", { name: "Movies", exact: true })).toHaveAttribute("aria-selected", "true");
  await genre.selectOption("27");
  await apply.click();
  await expect(titles).toHaveText([title]);
  await seasonal.getByRole("tab", { name: "Series", exact: true }).click();
  await expect(genre).toHaveValue("all");
  await expect(genre.getByRole("option", { name: "Horror", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/genre=all/);
});

test("seasonal icon actions persist and respect selected libraries and user access", async ({ page }) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(fakeUser.username);
  await page.getByLabel("Password").fill(fakeUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);

  const databaseUrl = process.env.CUED_E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("CUED_E2E_DATABASE_URL is required");
  if (decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) !== e2eDatabaseName) {
    throw new Error(`E2E database must be named exactly ${e2eDatabaseName}`);
  }
  const database = postgres(databaseUrl, { max: 1 });
  const playlistUuid = "a1630f5e-2700-402e-ab1e-50e24f84bab3";
  try {
    const [user] = await database`
      update users set role = 'admin', seasonal_themes = '["halloween"]'::jsonb where jellyfin_user_id = ${fakeUser.id} returning id
    `;
    const [jellyfin] = await database`select id from integrations where provider = 'jellyfin'`;
    const [ownedLibrary] = await database`
      insert into media_libraries (integration_id, jellyfin_library_id, name, collection_type, selected)
      values (${jellyfin!.id}, 'e2e-owned-movies', 'E2E owned movies', 'movies', false)
      returning id
    `;
    await database`
      insert into user_library_access (user_id, library_id, accessible)
      values (${user!.id}, ${ownedLibrary!.id}, true)
    `;
    await database`
      insert into media_items (integration_id, jellyfin_item_id, jellyfin_library_id, kind, name, tmdb_id, raw)
      values (${jellyfin!.id}, 'e2e-seasonal-owned', 'e2e-owned-movies', 'movie', ${title}, 424244, '{}'::jsonb)
    `;
    const encryption = new SecretEncryption(e2eEncryptionKey);
    const configuration = {
      username: fakeUser.username,
      playbackUsername: "admin",
      playlistUuid,
      playlists: [{ uuid: playlistUuid, name: "E2E seasonal playlist" }],
      refreshJellyfin: false,
      movieLibraryIds: [] as string[],
      seriesLibraryIds: [] as string[],
    };
    const [integration] = await database`
      insert into integrations (provider, base_url, encrypted_api_key, encrypted_api_token, status, configuration)
      values ('m3u-editor', ${`${fakeProviderBaseUrl}/m3u`}, ${encryption.encrypt(fakeUser.password)},
        ${encryption.encrypt("e2e-api-token")}, 'healthy', ${JSON.stringify(configuration)}::jsonb)
      returning id
    `;
    const [streamLibrary] = await database`
      insert into media_libraries (integration_id, jellyfin_library_id, name, collection_type)
      values (${jellyfin!.id}, 'e2e-stream-movies', 'E2E IPTV movies', 'movies') returning id
    `;
    await database`
      update integrations set configuration = ${JSON.stringify({ ...configuration, movieLibraryIds: [streamLibrary!.id] })}::jsonb
      where id = ${integration!.id}
    `;
    await database`
      insert into user_library_access (user_id, library_id, accessible)
      values (${user!.id}, ${streamLibrary!.id}, false)
    `;
    const [source] = await database`
      insert into external_media_availability (integration_id, media_type, tmdb_id, external_id, title, group_name, container_extension)
      values (${integration!.id}, 'movie', 424245, 'seasonal-701', 'E2E More Seasonal', 'E2E Halloween IPTV', 'mkv')
      returning id
    `;

    await page.goto("/en/seasonal?theme=halloween");
    const seasonal = page.getByRole("region", { name: "Seasonal titles" });
    const first = seasonal
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    const more = seasonal
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "E2E More Seasonal", exact: true }) });
    await expect(first.getByRole("button", { name: "Available in Jellyfin", exact: true })).toHaveCount(0);
    await database`update media_libraries set selected = true where id = ${ownedLibrary!.id}`;
    await page.reload();
    const availableBadge = first.getByRole("button", { name: "Available in Jellyfin", exact: true });
    await expect(availableBadge).toBeVisible();
    await expect(availableBadge).toHaveText("");
    await expect(availableBadge.locator("svg")).toBeVisible();
    await database`update user_library_access set accessible = false where user_id = ${user!.id} and library_id = ${ownedLibrary!.id}`;
    await page.reload();
    await expect(availableBadge).toHaveCount(0);
    await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
    await expect(more.getByRole("button", { name: "Follow", exact: true })).toBeVisible();
    await expect(more.getByRole("button", { name: "Request", exact: true })).toHaveCount(0);
    await expect(more.getByRole("button", { name: "Can be added as STRM", exact: true })).toHaveCount(0);
    const deniedStatus = await page.evaluate(async (sourceId) => {
      const response = await fetch("/api/requests/iptv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "movie", tmdbId: 424245, sourceId, locale: "en" }),
      });
      return response.status;
    }, source!.id);
    expect(deniedStatus).toBe(403);

    await database`
      insert into integrations (provider, base_url, encrypted_api_key, status, configuration)
      values ('radarr', ${`${fakeProviderBaseUrl}/radarr`}, ${encryption.encrypt("e2e-radarr-api-key")}, 'healthy',
        '{"rootFolderPath":"/e2e/movies","qualityProfileId":1}'::jsonb)
    `;
    await database`update users set role = 'user', requests_require_approval = true where id = ${user!.id}`;
    await database`update user_library_access set accessible = true where user_id = ${user!.id} and library_id = ${streamLibrary!.id}`;
    await page.reload();
    await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
    const requestableBadge = more.getByRole("button", { name: "Can be added as STRM", exact: true });
    await expect(requestableBadge).toBeVisible();
    await expect(requestableBadge).toHaveText("");
    await expect(requestableBadge.locator("svg")).toBeVisible();
    await more.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(more.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();
    await page.reload();
    await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
    await expect(more.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();
    const request = more.getByRole("button", { name: "Request", exact: true });
    await expect(request).toHaveText("");
    await expect(request.locator("svg")).toBeVisible();
    await request.click();
    const dialog = page.getByRole("dialog", { name: "Request media", exact: true });
    await dialog.getByRole("radio", { name: /STRM file/ }).check();
    await expect(
      dialog.getByLabel("Stream source").getByRole("option", { name: "E2E Halloween IPTV — E2E More Seasonal" }),
    ).toBeAttached();
    await expect(dialog.getByLabel("Stream source")).toHaveValue(source!.id);
    await dialog.getByRole("radio", { name: /Radarr \/ Sonarr/ }).check();
    await expect(dialog.getByLabel("Root folder")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Send request", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const removal = more.getByRole("button", { name: "Remove request", exact: true });
    await expect(removal).toBeVisible();
    await expect(removal).toHaveText("");
    const requests = await database`
      select media_type, tmdb_id, status, user_id, reviewed_by_user_id, provider_item_id
      from acquisition_requests where tmdb_id = 424245
    `;
    expect(requests).toEqual([
      {
        media_type: "movie",
        tmdb_id: 424245,
        status: "pending",
        user_id: user!.id,
        reviewed_by_user_id: null,
        provider_item_id: null,
      },
    ]);
    await page.reload();
    await seasonal.getByRole("button", { name: "Show more", exact: true }).click();
    await expect(more.getByRole("button", { name: "Unfollow", exact: true })).toBeVisible();
    await expect(removal).toBeVisible();
    await expect(removal.locator("svg")).toBeVisible();
    await expect(more.getByRole("button", { name: "Request", exact: true })).toHaveCount(0);
    await first.getByRole("button", { name: "Request", exact: true }).click();
    await expect(first.getByRole("button", { name: "Remove request", exact: true })).toBeVisible();
    await page.reload();
    await expect(first.getByRole("button", { name: "Remove request", exact: true })).toBeVisible();
    await page.goto("/en/");
    const picks = page.getByRole("region", { name: "Your seasonal picks", exact: true });
    const dashboardCard = picks
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(dashboardCard.getByRole("button", { name: "Remove request", exact: true })).toBeVisible();
  } finally {
    await database.end();
  }
});
