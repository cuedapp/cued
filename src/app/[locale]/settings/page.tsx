import { Info, Languages, Palette } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePicker } from "@/components/theme-picker";
import { LanguagePicker } from "@/components/language-picker";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="size-5" /></div><CardTitle>{t("appearance")}</CardTitle><CardDescription>{t("appearanceHelp")}</CardDescription></CardHeader>
          <CardContent><ThemePicker /></CardContent>
        </Card>
        <Card>
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Languages className="size-5" /></div><CardTitle>{t("language")}</CardTitle><CardDescription>{t("languageHelp")}</CardDescription></CardHeader>
          <CardContent><LanguagePicker /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Info className="size-5" /></div><CardTitle>{t("about")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("version")}</div><div className="mt-1 font-medium">0.1.0</div></div><div className="rounded-xl bg-muted/60 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("stage")}</div><div className="mt-1 font-medium">{t("milestone")}</div></div></CardContent>
        </Card>
      </div>
    </div>
  );
}
