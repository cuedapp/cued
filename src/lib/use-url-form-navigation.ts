"use client";

import { type FormEvent, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

type Query = Record<string, string | number | undefined>;

export function useUrlFormNavigation(
  buildQuery: (data: FormData) => Query,
  options: { mode?: "push" | "replace"; onNavigated?: (form: HTMLFormElement) => void } = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const query = Object.fromEntries(
      Object.entries(buildQuery(new FormData(form))).filter(([, value]) => value !== undefined && value !== ""),
    );
    startTransition(() => {
      router[options.mode ?? "replace"]({ pathname, query }, { scroll: false });
      options.onNavigated?.(form);
    });
  }

  return { isPending, onSubmit };
}
