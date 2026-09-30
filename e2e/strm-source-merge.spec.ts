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
    const [integration] = await database`
      insert into integrations (provider, base_url, encrypted_api_key, encrypted_api_token, status, configuration)
      values (
        'm3u-editor',
        ${`${fakeProviderBaseUrl}/m3u`},
        ${encryption.encrypt(fakeUser.password)},
        ${encryption.encrypt("e2e-api-token")},
        'healthy',
        ${JSON.stringify({
          username: fakeUser.username,
          playbackUsername: "admin",
          playlistUuid,
          playlists: [{ uuid: playlistUuid, name: "E2E playlist" }],
          seriesDirectory: "series",
          refreshJellyfin: false,
          strmSeriesUpdateMode: "manual",
          movieLibraryIds: [],
          seriesLibraryIds: [],
        })}::jsonb
      )
      returning id
    `;
    await database`
      insert into external_media_availability (integration_id, media_type, tmdb_id, external_id, title, group_name)
      values
        (${integration!.id}, 'series', 800001, '501', 'Coverage Series', 'Primary IPTV'),
        (${integration!.id}, 'series', 800001, '502', 'Coverage Series', 'Secondary IPTV')
    `;
    await database`
      insert into managed_strm_series (
        integration_id, tmdb_id, playlist_uuid, external_id, secondary_external_id,
        title, relative_directory
      ) values (
        ${integration!.id}, 800001, ${playlistUuid}, '501', '502',
        'Coverage Series', 'series/Coverage Series [tmdbid-800001]'
      )
    `;
  } finally {
    await database.end();
  }

  await page.goto("/en/settings/integrations/m3u-editor");
  const primary = page.getByLabel("Primary source");
  const secondary = page.getByLabel("Secondary source (optional)");
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  await expect(primary.getByRole("option", { name: "Coverage Series — Primary IPTV" })).toBeAttached();
  await expect(secondary.getByRole("option", { name: "Coverage Series — Secondary IPTV" })).toBeAttached();
  await page.getByRole("button", { name: "Compare source coverage" }).click();
  await expect(
    page.getByText("Primary: 2 · Secondary: 2 · Shared: 1 · Only primary: 1 · Only secondary: 1 · Combined: 3"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Resync episodes" })).toBeVisible();
});
