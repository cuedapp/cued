"use client";

import { CircleHelp, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { viewingIntentPresets, type ViewingIntentPreset } from "@/lib/viewing-intent";
import { AppDialog } from "./app-dialog";

export function ViewingIntentControls({ presets, text, onPresetsChange, onTextChange }: { presets: ViewingIntentPreset[]; text: string; onPresetsChange: (presets: ViewingIntentPreset[]) => void; onTextChange: (text: string) => void }) {
  const t = useTranslations("ViewingIntent");
  const [helpOpen, setHelpOpen] = useState(false);
  const active = presets.length > 0 || Boolean(text);
  const toggle = (preset: ViewingIntentPreset) => onPresetsChange(presets.includes(preset) ? presets.filter((item) => item !== preset) : [...presets, preset]);

  function clear() {
    onPresetsChange([]);
    onTextChange("");
  }

  return <>
    <section className="rounded-xl bg-muted/20 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Sparkles className="size-4" /></span><div><div className="flex items-center gap-1"><h2 className="text-sm font-semibold">{t("title")}</h2><button type="button" onClick={() => setHelpOpen(true)} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t("helpLabel")}><CircleHelp className="size-4" /></button></div><p className="text-xs text-muted-foreground">{t("help")}</p></div></div>{active && <button type="button" onClick={clear} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t("clear")}><X className="size-4" /></button>}</div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("title")}>{viewingIntentPresets.map((preset) => <button key={preset} type="button" onClick={() => toggle(preset)} aria-pressed={presets.includes(preset)} className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">{t(`tags.${preset}`)}</button>)}</div>
      <label className="mt-3 block max-w-3xl"><span className="sr-only">{t("freeText")}</span><input value={text} onChange={(event) => onTextChange(event.target.value)} maxLength={120} placeholder={t("placeholder")} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" /></label>
    </section>
    <AppDialog isOpen={helpOpen} onOpenChange={setHelpOpen} label={t("helpTitle")} className="max-w-lg"><div className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-2xl font-semibold">{t("helpTitle")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("helpBody")}</p></div><button type="button" onClick={() => setHelpOpen(false)} className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={t("close")}><X className="size-4" /></button></div><dl className="mt-5 grid gap-3 text-sm"><div><dt className="font-medium">{t("helpTagsTitle")}</dt><dd className="mt-1 text-muted-foreground">{t("helpTagsBody")}</dd></div><div><dt className="font-medium">{t("helpTextTitle")}</dt><dd className="mt-1 text-muted-foreground">{t("helpTextBody")}</dd></div><div><dt className="font-medium">{t("helpPrivacyTitle")}</dt><dd className="mt-1 text-muted-foreground">{t("helpPrivacyBody")}</dd></div></dl><div className="mt-6 flex justify-end"><button type="button" onClick={() => setHelpOpen(false)} className="h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">{t("close")}</button></div></div></AppDialog>
  </>;
}
