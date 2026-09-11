"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function FormSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: ButtonProps & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
