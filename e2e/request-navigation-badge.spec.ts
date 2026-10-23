import postgres from "postgres";
import { expect, test } from "./fixtures";
import { fakeUser } from "./support/constants.mjs";

test("administrators see pending request counts in desktop and mobile navigation", async ({ page }) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(fakeUser.username);
  await page.getByLabel("Password").fill(fakeUser.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);

  const databaseUrl = process.env.CUED_E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("CUED_E2E_DATABASE_URL is required for the request navigation test.");
  const database = postgres(databaseUrl, { max: 1 });
  try {
    const [user] = await database`select id from users where username = ${fakeUser.username}`;
    if (!user) throw new Error("The E2E user was not created during sign-in.");
    await database`update users set role = 'admin' where id = ${user.id}`;
    await database`
      insert into acquisition_requests (user_id, media_type, tmdb_id)
      values (${user.id}, 'movie', 424242)
    `;
  } finally {
    await database.end();
  }

  await page.reload();
  const desktopRequests = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", {
    name: /Requests.*1 request needs your attention/,
  });
  await expect(desktopRequests).toBeVisible();
  await expect(desktopRequests).toContainText("1");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("menuitem", { name: /Requests.*1 request needs your attention/ })).toBeVisible();
});
