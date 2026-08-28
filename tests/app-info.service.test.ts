import { describe, expect, it } from "vitest";
import { AppInfoService } from "@/server/application/app-info.service";

describe("AppInfoService", () => {
  it("describes the implemented foundation", () => {
    expect(new AppInfoService().getInfo()).toEqual({ name: "Cued", milestone: 8, status: "ready" });
  });
});
