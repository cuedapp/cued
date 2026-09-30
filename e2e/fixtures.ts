import { expect, test as playwrightTest } from "@playwright/test";
import { resetE2EDatabase } from "./support/database";

playwrightTest.beforeEach(async () => {
  await resetE2EDatabase();
});

export const test = playwrightTest;
export { expect };
