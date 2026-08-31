import { describe, expect, it, vi } from "vitest";
import { AcquisitionService } from "@/server/application/acquisition.service";
import type { ArrIntegrationService } from "@/server/application/arr-integration.service";
import type { AcquisitionRepository } from "@/server/db/repositories/acquisition.repository";
import type { User } from "@/server/db/schema";

const regularUser = { id: "user", role: "user", requestsRequireApproval: true } as User;

describe("AcquisitionService", () => {
  it("paginates a user's durable request history", async () => {
    const repository = { getForUser: vi.fn()
      .mockResolvedValueOnce({ total: 21, items: [] })
      .mockResolvedValueOnce({ total: 21, items: [{ request: { id: "last" }, reviewerName: null }] }) } as unknown as AcquisitionRepository;
    const service = new AcquisitionService(repository, {} as ArrIntegrationService, {} as ArrIntegrationService);

    const result = await service.getForUser("user", 99, 20);

    expect(result).toMatchObject({ page: 2, totalPages: 2, total: 21 });
    expect(repository.getForUser).toHaveBeenLastCalledWith("user", 2, 20);
  });

  it("queues regular-user requests when approval is required", async () => {
    const repository = { findPending: vi.fn().mockResolvedValue(undefined), createPending: vi.fn().mockResolvedValue({ request: { id: "request" }, created: true }) } as unknown as AcquisitionRepository;
    const radarr = { getRequestState: vi.fn().mockResolvedValue("requestable"), request: vi.fn() } as unknown as ArrIntegrationService;
    const result = await new AcquisitionService(repository, radarr, {} as ArrIntegrationService).request(regularUser, "movie", 10, { rootFolderPath: "/not-allowed", qualityProfileId: 99 });
    expect(result).toEqual({ state: "pending", requestId: "request" });
    expect(radarr.request).not.toHaveBeenCalled();
  });

  it("allows an individually exempted user to request directly", async () => {
    const repository = { findPending: vi.fn().mockResolvedValue(undefined), createPending: vi.fn().mockResolvedValue({ request: { id: "request" }, created: true }), complete: vi.fn() } as unknown as AcquisitionRepository;
    const radarr = { request: vi.fn().mockResolvedValue({ state: "requested", title: { id: 7 }, rootFolderPath: "/movies", qualityProfileId: 2 }) } as unknown as ArrIntegrationService;
    const result = await new AcquisitionService(repository, radarr, {} as ArrIntegrationService).request({ ...regularUser, requestsRequireApproval: false }, "movie", 10);
    expect(result).toEqual({ state: "requested", title: { id: 7 }, rootFolderPath: "/movies", qualityProfileId: 2 });
    expect(radarr.request).toHaveBeenCalledWith(10, {});
    expect(repository.complete).toHaveBeenCalledWith("request", "user", "approved", { providerItemId: 7, rootFolderPath: "/movies", qualityProfileId: 2 });
  });

  it("does not submit a title that already has a pending request", async () => {
    const repository = { findPending: vi.fn().mockResolvedValue({ id: "existing-request" }) } as unknown as AcquisitionRepository;
    const radarr = { request: vi.fn() } as unknown as ArrIntegrationService;
    const result = await new AcquisitionService(repository, radarr, {} as ArrIntegrationService).request({ ...regularUser, requestsRequireApproval: false }, "movie", 10);
    expect(result).toEqual({ state: "pending", requestId: "existing-request" });
    expect(radarr.request).not.toHaveBeenCalled();
  });

  it("submits an approved pending request and records its reviewer", async () => {
    const repository = { getById: vi.fn().mockResolvedValue({ id: "request", status: "pending", mediaType: "series", tmdbId: 20 }), complete: vi.fn() } as unknown as AcquisitionRepository;
    const options = { rootFolderPath: "/series", qualityProfileId: 3 };
    const sonarr = { request: vi.fn().mockResolvedValue({ state: "requested", title: { id: 8 }, ...options }) } as unknown as ArrIntegrationService;
    await new AcquisitionService(repository, {} as ArrIntegrationService, sonarr).approve("request", "admin", options);
    expect(sonarr.request).toHaveBeenCalledWith(20, options);
    expect(repository.complete).toHaveBeenCalledWith("request", "admin", "approved", { providerItemId: 8, ...options });
  });
});
