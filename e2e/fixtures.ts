import { expect, test as playwrightTest } from "@playwright/test";
import { resetE2EDatabase } from "./support/database";

export const test = playwrightTest.extend<{ databaseReset: void }>({
  databaseReset: [
    async ({}, use) => {
      await resetE2EDatabase();
      await use();
    },
    { auto: true },
  ],
});
export { expect };
