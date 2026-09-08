"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import type { ViewingIntentPreset } from "@/lib/viewing-intent";
import { ViewingIntentControls } from "@/components/viewing-intent-controls";

export function LibraryViewingIntent({
  presets: initialPresets,
  text: initialText,
  query,
}: {
  presets: ViewingIntentPreset[];
  text: string;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [presets, setPresets] = useState(initialPresets);
  const [text, setText] = useState(initialText);
  const navigate = (nextPresets: ViewingIntentPreset[], nextText: string) =>
    startTransition(() =>
      router.replace(
        { pathname: "/library", query: { ...query, intent: nextPresets.join(","), intentText: nextText } },
        { scroll: false },
      ),
    );
  return (
    <ViewingIntentControls
      presets={presets}
      text={text}
      onPresetsChange={(next) => {
        setPresets(next);
        navigate(next, text);
      }}
      onTextChange={(next) => {
        setText(next);
        navigate(presets, next);
      }}
    />
  );
}
