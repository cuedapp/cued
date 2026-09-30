import { expect, test } from "./fixtures";
import { fakeMovie, fakeUser } from "./support/constants.mjs";

const jellyfinCredentials = {
  username: fakeUser.username,
  password: fakeUser.password,
};

test("protected browsing redirects to sign-in and rejects invalid Jellyfin credentials", async ({ page }) => {
  await page.goto("/en/search");
  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in with Jellyfin" })).toBeVisible();

  await page.getByLabel("Username").fill(jellyfinCredentials.username);
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("The username or password was not accepted by Jellyfin.")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/login$/);
});

test("a user can search, follow a title, and retain that follow after reload", async ({ page }) => {
  await page.goto("/en/login");
  await page.getByLabel("Username").fill(jellyfinCredentials.username);
  await page.getByLabel("Password").fill(jellyfinCredentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
  await expect(page.getByRole("heading", { name: "Recommended for you", exact: true })).toBeVisible();

  await page.goto("/en/search");
  await page
    .locator("#main-content")
    .getByRole("textbox", { name: "Search movies, series and people" })
    .fill("E2E Fixture");
  await page.locator("#main-content").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/search\?q=E2E(?:%20|\+)Fixture$/);
  await page.getByRole("heading", { name: fakeMovie.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/en/title/movie/${fakeMovie.id}$`));
  await expect(page.getByRole("heading", { name: fakeMovie.title, exact: true })).toBeVisible();

  const followButton = page.getByRole("button", { name: "Follow", exact: true });
  const unfollowButton = page.getByRole("button", { name: "Unfollow", exact: true });
  if (await unfollowButton.count()) await unfollowButton.click();
  await expect(followButton).toBeVisible();
  await followButton.click();
  await expect(unfollowButton).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: fakeMovie.title, exact: true })).toBeVisible();
  await expect(unfollowButton).toBeVisible();
});
