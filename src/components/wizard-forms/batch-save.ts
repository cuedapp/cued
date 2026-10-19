import type { FormEvent } from "react";

/**
 * Saving several wizard forms from one "Save and continue" button.
 *
 * A step like Acquisition renders independent forms (Radarr, Sonarr, M3U Editor).
 * Only forms the user actually changed are submitted, so an untouched form is
 * never saved blank. Each form reports back through a DOM event instead of
 * navigating on its own while a batch is running.
 */
const resultEvent = "wizard-save-result";

export type BatchSaveStatus = "none" | "invalid" | "saved" | "failed";

export function markFormTouched(form: HTMLFormElement | null) {
  if (form) form.dataset.wizardTouched = "true";
}

/** Called by a form after its action finished; returns true if the batch took over navigation. */
export function reportBatchResult(form: HTMLFormElement | null, ok: boolean) {
  if (!form || form.dataset.wizardBatch !== "true") return false;
  if (ok) delete form.dataset.wizardTouched;
  form.dispatchEvent(new CustomEvent(resultEvent, { detail: { ok } }));
  return true;
}

function submitAndWait(form: HTMLFormElement) {
  return new Promise<boolean>((resolve) => {
    form.addEventListener(resultEvent, (event) => resolve((event as CustomEvent<{ ok: boolean }>).detail.ok), {
      once: true,
    });
    form.dataset.wizardBatch = "true";
    form.requestSubmit();
  }).finally(() => {
    delete form.dataset.wizardBatch;
  });
}

export async function saveTouchedForms(forms: HTMLFormElement[]): Promise<BatchSaveStatus> {
  const touched = forms.filter((form) => form.dataset.wizardTouched === "true");
  if (touched.length === 0) return "none";
  const invalid = touched.find((form) => !form.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return "invalid";
  }
  let failed = false;
  for (const form of touched) {
    if (!(await submitAndWait(form))) failed = true;
  }
  return failed ? "failed" : "saved";
}

export function interceptAcquisitionSubmit(event: FormEvent<HTMLFormElement>, saveAndContinue: () => Promise<void>) {
  const form = event.currentTarget;
  if (form.dataset.wizardBatch === "true" || new FormData(form).get("intent") === "test") return;
  event.preventDefault();
  // The browser's submit-dispatch flag survives microtasks in the event handler.
  // Start a new task so requestSubmit can dispatch the batched submission.
  setTimeout(() => void saveAndContinue(), 0);
}
