import { describe, expect, it } from "vitest";
import { AppInfoService } from "@/server/application/app-info.service";

describe("AppInfoService", () => {
  it("describes the current implemented milestone", () => {
    expect(new AppInfoService().getInfo()).toEqual({ name: "Cued", milestone: 14, status: "ready" });
  });
});
