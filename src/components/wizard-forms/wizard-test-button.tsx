"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";

/**
 * React resets an uncontrolled form once its action finishes, which blanked
 * every field (including secrets) after a test or a failed save. Pass this as
 * the form's `onReset` to keep what was typed.
 */
export function keepFormValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

/**
 * Runs the enclosing wizard form's "test" intent without saving. The form keeps
 * its hidden "save" intent, so "Save and continue" (which submits the form
 * without a submitter) is unaffected; the intent is flipped only for the
 * synchronous submit and restored straight after.
 */
export function WizardTestButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={(event) => {
        const form = event.currentTarget.form;
        const intent = form?.elements.namedItem("intent");
        if (!form || !(intent instanceof HTMLInputElement)) return;
        intent.value = "test";
        try {
          form.requestSubmit();
        } finally {
          intent.value = "save";
        }
      }}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
