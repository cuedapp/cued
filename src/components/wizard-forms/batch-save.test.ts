// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { markFormTouched, reportBatchResult, saveTouchedForms } from "./batch-save";

function makeForm({ ok = true, valid = true, respond = true } = {}) {
  const form = document.createElement("form");
  const input = document.createElement("input");
  input.name = "baseUrl";
  input.required = true;
  input.value = valid ? "http://radarr:7878" : "";
  form.append(input);
  document.body.append(form);
  const submitted = vi.fn();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted();
    if (respond) queueMicrotask(() => reportBatchResult(form, ok));
  });
  return { form, submitted };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("saveTouchedForms", () => {
  it("does nothing when no form was touched", async () => {
    const radarr = makeForm();
    const sonarr = makeForm();

    await expect(saveTouchedForms([radarr.form, sonarr.form])).resolves.toBe("none");

    expect(radarr.submitted).not.toHaveBeenCalled();
    expect(sonarr.submitted).not.toHaveBeenCalled();
  });

  it("saves every touched form and skips untouched ones", async () => {
    const radarr = makeForm();
    const sonarr = makeForm();
    const m3u = makeForm({ valid: false });
    markFormTouched(radarr.form);
    markFormTouched(sonarr.form);

    await expect(saveTouchedForms([radarr.form, sonarr.form, m3u.form])).resolves.toBe("saved");

    expect(radarr.submitted).toHaveBeenCalledTimes(1);
    expect(sonarr.submitted).toHaveBeenCalledTimes(1);
    expect(m3u.submitted).not.toHaveBeenCalled();
    expect(radarr.form.dataset.wizardTouched).toBeUndefined();
    expect(radarr.form.dataset.wizardBatch).toBeUndefined();
  });

  it("saves nothing when a touched form has a blank required field", async () => {
    const radarr = makeForm();
    const sonarr = makeForm({ valid: false });
    markFormTouched(radarr.form);
    markFormTouched(sonarr.form);

    await expect(saveTouchedForms([radarr.form, sonarr.form])).resolves.toBe("invalid");

    expect(radarr.submitted).not.toHaveBeenCalled();
    expect(sonarr.submitted).not.toHaveBeenCalled();
  });

  it("still saves the other forms when one fails, and reports the failure", async () => {
    const radarr = makeForm({ ok: false });
    const sonarr = makeForm();
    markFormTouched(radarr.form);
    markFormTouched(sonarr.form);

    await expect(saveTouchedForms([radarr.form, sonarr.form])).resolves.toBe("failed");

    expect(sonarr.submitted).toHaveBeenCalledTimes(1);
    expect(radarr.form.dataset.wizardTouched).toBe("true");
  });
});

describe("reportBatchResult", () => {
  it("leaves navigation to the form when no batch is running", () => {
    const { form } = makeForm();
    expect(reportBatchResult(form, true)).toBe(false);
  });
});
