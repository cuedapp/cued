import { NextResponse } from "next/server";
import { healthService } from "@/server/application/services";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await healthService.check();
  if (report.status !== "ok") logger.error("Health check failed", { database: report.database });
  return NextResponse.json(report, { status: report.status === "ok" ? 200 : 503 });
}
