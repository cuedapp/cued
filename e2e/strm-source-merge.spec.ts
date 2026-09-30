import postgres from "postgres";
import { expect, test } from "./fixtures";
import { fakeProviderBaseUrl, fakeUser, e2eEncryptionKey } from "./support/constants.mjs";
import { SecretEncryption } from "@/server/security/encryption";
const playlistUuid = "a1630f5e-2700-402e-ab1e-50e24f84bab3";

test("admins compare two STRM source groups before resyncing files", async ({ page }) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(fakeUser.username);
  await page.getByLabel("Password").fill(fakeUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);

  const databaseUrl = process.env.CUED_E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("CUED_E2E_DATABASE_URL is required");
  const database = postgres(databaseUrl, { max: 1 });
  try {
    await database`update users set role = 'admin' where jellyfin_user_id = ${fakeUser.id}`;
    const encryption = new SecretEncryption(e2eEncryptionKey);
    const m3uConfiguration = {
      username: fakeUser.username,
      playbackUsername: "admin",
      playlistUuid,
      playlists: [{ uuid: playlistUuid, name: "E2E playlist" }],
      seriesDirectory: "series",
      refreshJellyfin: false,
      strmSeriesUpdateMode: "manual",
      movieLibraryIds: [],
      seriesLibraryIds: [] as string[],
    };
    const [integration] = await database`
      insert into integrations (provider, base_url, encrypted_api_key, encrypted_api_token, status, configuration)
      values (
        'm3u-editor',
        ${`${fakeProviderBaseUrl}/m3u`},
        ${encryption.encrypt(fakeUser.password)},
        ${encryption.encrypt("e2e-api-token")},
        'healthy',
        ${JSON.stringify(m3uConfiguration)}::jsonb
      )
      returning id
    `;
    const [library] = await database`
      insert into media_libraries (integration_id, jellyfin_library_id, name, collection_type)
      values (${integration!.id}, 'e2e-series-library', 'E2E Series', 'tvshows')
      returning id
    `;
    await database`
      update integrations
      set configuration = ${JSON.stringify({ ...m3uConfiguration, seriesLibraryIds: [library!.id] })}::jsonb
      where id = ${integration!.id}
    `;
    await database`
      insert into user_library_access (user_id, library_id, accessible)
      select id, ${library!.id}, true from users where jellyfin_user_id = ${fakeUser.id}
    `;
    await database`
      insert into external_media_availability (integration_id, media_type, tmdb_id, external_id, title, group_name)
      values
        (${integration!.id}, 'series', 800001, '501', 'Coverage Series', 'Primary IPTV'),
        (${integration!.id}, 'series', 800001, '502', 'Coverage Series', 'Secondary IPTV'),
        (${integration!.id}, 'series', 800002, '503', 'Single Source Series', 'Single IPTV'),
        (${integration!.id}, 'series', 800003, '601', 'Requestable Series', 'Primary IPTV'),
        (${integration!.id}, 'series', 800003, '602', 'Requestable Series', 'Secondary IPTV')
    `;
    await database`
      insert into managed_strm_series (
        integration_id, tmdb_id, playlist_uuid, external_id, secondary_external_id,
        title, relative_directory
      ) values
        (
          ${integration!.id}, 800001, ${playlistUuid}, '501', '502',
          'Coverage Series', 'series/Coverage Series [tmdbid-800001]'
        ),
        (
          ${integration!.id}, 800002, ${playlistUuid}, '503', null,
          'Single Source Series', 'series/Single Source Series [tmdbid-800002]'
        )
    `;
  } finally {
    await database.end();
  }

  await page.goto("/en/settings/integrations/m3u-editor");
  const primary = page.getByLabel("Primary source");
  const secondary = page.getByLabel("Secondary source (optional)");
  await expect(primary).toBeVisible();
  await expect(primary).toHaveValue("501");
  await expect(secondary).toHaveValue("502");
  await expect(secondary).toBeVisible();
  await expect(primary.getByRole("option", { name: "Coverage Series — Primary IPTV" })).toBeAttached();
  await expect(secondary.getByRole("option", { name: "Coverage Series — Secondary IPTV" })).toBeAttached();
  await primary.locator("xpath=ancestor::form").getByRole("button", { name: "Compare source coverage" }).click();
  await expect(
    page.getByText("Primary: 2 · Secondary: 2 · Shared: 1 · Only primary: 1 · Only secondary: 1 · Combined: 3"),
  ).toBeVisible();
  await expect(primary.locator("xpath=ancestor::form").getByRole("button", { name: "Resync episodes" })).toBeVisible();
  const singleSource = page.getByText("Single Source Series — Single IPTV");
  await expect(singleSource).toBeVisible();
  const singleSourceForm = singleSource.locator("xpath=ancestor::form");
  await expect(singleSourceForm).toContainText("Primary source:");
  await expect(singleSourceForm.getByRole("button", { name: "Compare source coverage" })).toHaveCount(0);
  await page.goto("/en/title/series/800003");
  await page.getByRole("button", { name: "Request", exact: true }).click();
  const requestPrimary = page.getByLabel("Primary stream source");
  const requestSecondary = page.getByLabel("Secondary stream source (optional)");
  await expect(requestPrimary).toBeVisible();
  await expect(requestSecondary).toBeVisible();
  await expect(requestPrimary.getByRole("option", { name: "Primary IPTV — Requestable Series" })).toBeAttached();
  await expect(requestSecondary.getByRole("option", { name: "Secondary IPTV — Requestable Series" })).toBeAttached();
  const selectedSecondary = await requestSecondary.selectOption({ label: "Secondary IPTV — Requestable Series" });
  await expect(requestSecondary).toHaveValue(selectedSecondary[0]!);
});
