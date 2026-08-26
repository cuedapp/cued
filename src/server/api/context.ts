import { appInfoService } from "@/server/application/services";
import type { AppInfoService } from "@/server/application/app-info.service";

export interface TrpcContext {
  requestId: string;
  services: { appInfo: AppInfoService };
}

export function createTrpcContext(requestId = crypto.randomUUID(), services = { appInfo: appInfoService }): TrpcContext {
  return { requestId, services };
}
