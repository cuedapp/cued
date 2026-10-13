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

function submitAndWait(form: HTMLFormElement, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      form.removeEventListener(resultEvent, onResult);
      resolve(false);
    }, timeoutMs);
    function onResult(event: Event) {
      clearTimeout(timer);
      resolve((event as CustomEvent<{ ok: boolean }>).detail.ok);
    }
    form.addEventListener(resultEvent, onResult, { once: true });
    form.dataset.wizardBatch = "true";
    form.requestSubmit();
  }).finally(() => {
    delete form.dataset.wizardBatch;
  });
}

export async function saveTouchedForms(forms: HTMLFormElement[], timeoutMs = 60_000): Promise<BatchSaveStatus> {
  const touched = forms.filter((form) => form.dataset.wizardTouched === "true");
  if (touched.length === 0) return "none";
  const invalid = touched.find((form) => !form.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return "invalid";
  }
  let failed = false;
  for (const form of touched) {
    if (!(await submitAndWait(form, timeoutMs))) failed = true;
  }
  return failed ? "failed" : "saved";
}
