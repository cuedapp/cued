import { expect, test } from "./fixtures";

test("the Jellyfin setup step exposes its required connection fields", async ({ page }) => {
  await page.goto("/en/setup/jellyfin");

  await expect(page).toHaveURL(/\/en\/setup\/jellyfin$/);
  await expect(page.getByRole("heading", { name: "Jellyfin", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Setup steps" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Jellyfin URL", exact: true })).toHaveAttribute("required", "");
  await expect(page.getByLabel("API key")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load libraries" })).toBeVisible();
});

test("setup stepper navigates between integration steps", async ({ page }) => {
  await page.goto("/en/setup/jellyfin");

  await page.getByRole("button", { name: /TMDB/ }).click();
  await expect(page).toHaveURL(/\/en\/setup\/tmdb$/);
  await expect(page.getByRole("heading", { name: "TMDB", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: /Acquisition/ }).click();
  await expect(page).toHaveURL(/\/en\/setup\/acquisition$/);
  await expect(page.getByRole("heading", { name: "Acquisition", level: 1 })).toBeVisible();
});

test("leaving a dirty setup step requires confirmation", async ({ page }) => {
  await page.goto("/en/setup/jellyfin");

  const jellyfinUrl = page.getByRole("textbox", { name: "Jellyfin URL", exact: true });
  await jellyfinUrl.fill("http://jellyfin.example.test");
  await page.getByRole("button", { name: /TMDB/ }).click();

  const dialog = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/en\/setup\/jellyfin$/);
  await expect(jellyfinUrl).toHaveValue("http://jellyfin.example.test");

  await page.getByRole("button", { name: /TMDB/ }).click();
  await dialog.getByRole("button", { name: "Discard and leave" }).click();
  await expect(page).toHaveURL(/\/en\/setup\/tmdb$/);
});

test("the browser blocks submission without a Jellyfin URL", async ({ page }) => {
  await page.goto("/en/setup/jellyfin");

  const jellyfinUrl = page.getByRole("textbox", { name: "Jellyfin URL", exact: true });
  await jellyfinUrl.fill("");
  await jellyfinUrl.press("Enter");

  await expect(page).toHaveURL(/\/en\/setup\/jellyfin$/);
  await expect(jellyfinUrl).toBeFocused();
  expect(await jellyfinUrl.evaluate((input) => (input as HTMLInputElement).validity.valueMissing)).toBe(true);
});
