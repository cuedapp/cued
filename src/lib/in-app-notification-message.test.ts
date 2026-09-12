import { describe, expect, it } from "vitest";
import { notificationMessageValues } from "./in-app-notification-message";

describe("notificationMessageValues", () => {
  it("interpolates STRM titles instead of passing empty translation values", () => {
    expect(notificationMessageValues("strm.completed", "Arrival", null, "someone you follow")).toEqual({
      title: "Arrival",
      person: "someone you follow",
    });
  });

  it("uses the followed person's name when it is available", () => {
    expect(
      notificationMessageValues("follow.new_credit", "Ghostbusters", { person: "Bill Murray" }, "fallback"),
    ).toEqual({
      title: "Ghostbusters",
      person: "Bill Murray",
    });
  });
});
