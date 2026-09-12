"use client";

import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function LoadingButton({ pending, children, ...props }: ButtonProps & { pending: boolean }) {
  return (
    <Button {...props} disabled={pending || props.disabled} aria-busy={pending || undefined}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}
