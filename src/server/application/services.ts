import "server-only";
import { sql } from "@/server/db/client";
import { AppInfoService } from "./app-info.service";
import { HealthService } from "./health.service";

export const appInfoService = new AppInfoService();
export const healthService = new HealthService(async () => {
  await sql`select 1`;
});
