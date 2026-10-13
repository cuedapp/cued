// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { keepFormValues, WizardTestButton } from "./wizard-test-button";

afterEach(cleanup);

describe("WizardTestButton", () => {
  it("submits the form with the test intent and restores the save intent", () => {
    const submitted = vi.fn();
    render(
      <form
        aria-label="wizard"
        onSubmit={(event) => {
          event.preventDefault();
          submitted(new FormData(event.currentTarget).get("intent"));
        }}
      >
        <input type="hidden" name="intent" defaultValue="save" />
        <WizardTestButton label="Test connection" pendingLabel="Testing…" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));

    expect(submitted).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveBeenCalledWith("test");
    expect((screen.getByLabelText("wizard").querySelector('input[name="intent"]') as HTMLInputElement).value).toBe(
      "save",
    );
  });

  it("does not take over the form's default submit button", () => {
    render(
      <form aria-label="wizard">
        <input type="hidden" name="intent" defaultValue="save" />
        <WizardTestButton label="Test connection" pendingLabel="Testing…" />
      </form>,
    );

    expect(screen.getByRole("button", { name: "Test connection" }).getAttribute("type")).toBe("button");
    expect(screen.getByLabelText("wizard").querySelector('button[type="submit"]')).toBeNull();
  });

  it("keeps typed values after the form action finishes when onReset is keepFormValues", async () => {
    function Wizard({ keep }: { keep: boolean }) {
      return (
        <form aria-label={keep ? "kept" : "reset"} action={async () => {}} onReset={keep ? keepFormValues : undefined}>
          <input aria-label={keep ? "kept-token" : "reset-token"} name="token" defaultValue="" />
          <button type="submit">{keep ? "go-kept" : "go-reset"}</button>
        </form>
      );
    }
    render(
      <>
        <Wizard keep />
        <Wizard keep={false} />
      </>,
    );
    const kept = screen.getByLabelText("kept-token") as HTMLInputElement;
    const reset = screen.getByLabelText("reset-token") as HTMLInputElement;
    fireEvent.change(kept, { target: { value: "secret" } });
    fireEvent.change(reset, { target: { value: "secret" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "go-kept" }));
      fireEvent.click(screen.getByRole("button", { name: "go-reset" }));
    });

    expect(kept.value).toBe("secret");
    expect(reset.value).toBe("");
  });
});
