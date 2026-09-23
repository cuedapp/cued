"use client";

import { PageError } from "@/components/page-error";

export default function AuthenticatedError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageError retry={retry} />;
}
