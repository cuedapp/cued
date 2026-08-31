import { describe, expect, it } from "vitest";
import { canViewUserProfile } from "@/server/application/profile-access";

describe("profile access", () => {
  it("lets users view only their own profile", () => {
    expect(canViewUserProfile({ id: "user-a", role: "user" }, "user-a")).toBe(true);
    expect(canViewUserProfile({ id: "user-a", role: "user" }, "user-b")).toBe(false);
  });

  it("lets administrators deliberately inspect another user profile", () => {
    expect(canViewUserProfile({ id: "admin", role: "admin" }, "user-b")).toBe(true);
  });
});
