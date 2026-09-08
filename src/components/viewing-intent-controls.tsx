"use client";

import { CircleHelp, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { viewingIntentPresets, type ViewingIntentPreset } from "@/lib/viewing-intent";
import { AppDialog } from "./app-dialog";
import { Button } from "./ui/button";

export function ViewingIntentControls({
  presets,
  text,
  onPresetsChange,
  onTextChange,
  availablePresets = viewingIntentPresets,
}: {
  presets: ViewingIntentPreset[];
  text: string;
  onPresetsChange: (presets: ViewingIntentPreset[]) => void;
  onTextChange: (text: string) => void;
  availablePresets?: readonly ViewingIntentPreset[];
}) {
  const t = useTranslations("ViewingIntent");
  const [helpOpen, setHelpOpen] = useState(false);
  const active = presets.length > 0 || Boolean(text);
  const toggle = (preset: ViewingIntentPreset) =>
    onPresetsChange(presets.includes(preset) ? presets.filter((item) => item !== preset) : [...presets, preset]);

  function clear() {
    onPresetsChange([]);
    onTextChange("");
  }

  return (
    <>
      <section className="rounded-xl bg-muted/20 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-1">
                <h2 className="text-sm font-semibold">{t("title")}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setHelpOpen(true)}
                  className="size-7 text-muted-foreground"
                  aria-label={t("helpLabel")}
                >
                  <CircleHelp className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("help")}</p>
            </div>
          </div>
          {active && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clear}
              className="size-9 text-muted-foreground"
              aria-label={t("clear")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("title")}>
          {availablePresets.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggle(preset)}
              aria-pressed={presets.includes(preset)}
              className="aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {t(`tags.${preset}`)}
            </Button>
          ))}
        </div>
        <label className="mt-3 block max-w-3xl">
          <span className="sr-only">{t("freeText")}</span>
          <input
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            maxLength={120}
            placeholder={t("placeholder")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
      </section>
      <AppDialog isOpen={helpOpen} onOpenChange={setHelpOpen} label={t("helpTitle")} className="max-w-lg">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">{t("helpTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("helpBody")}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setHelpOpen(false)}
              className="size-9 shrink-0 text-muted-foreground"
              aria-label={t("close")}
            >
              <X className="size-4" />
            </Button>
          </div>
          <dl className="mt-5 grid gap-3 text-sm">
            <div>
              <dt className="font-medium">{t("helpTagsTitle")}</dt>
              <dd className="mt-1 text-muted-foreground">{t("helpTagsBody")}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("helpTextTitle")}</dt>
              <dd className="mt-1 text-muted-foreground">{t("helpTextBody")}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("helpPrivacyTitle")}</dt>
              <dd className="mt-1 text-muted-foreground">{t("helpPrivacyBody")}</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setHelpOpen(false)}>
              {t("close")}
            </Button>
          </div>
        </div>
      </AppDialog>
    </>
  );
}
