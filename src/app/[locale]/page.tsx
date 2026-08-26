import { ArrowUpRight, Database, Layers3, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SystemStatus } from "@/components/system-status";

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card px-6 py-10 shadow-sm sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-12 hidden h-40 w-64 rotate-[-8deg] rounded-t-[5rem] border border-primary/15 bg-gradient-to-t from-primary/12 to-transparent sm:block" />
        <div className="relative max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-4" />{t("eyebrow")}</div>
          <h1 className="font-display text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">{t("title")}<span className="text-primary">.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{t("intro")}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="min-h-72 overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Layers3 className="size-5" /></div>
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyBody")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 pt-6" aria-hidden="true">
            {[0, 1, 2].map((item) => <div key={item} className="aspect-[4/3] rounded-xl border border-dashed border-border bg-muted/35" />)}
          </CardContent>
        </Card>
        <Card className="bg-foreground text-background dark:bg-card dark:text-foreground">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Database className="size-5" /></div>
              <ArrowUpRight className="size-5 opacity-40" />
            </div>
            <CardTitle className="mt-5">{t("statusTitle")}</CardTitle>
            <CardDescription className="text-background/65 dark:text-muted-foreground">{t("statusBody")}</CardDescription>
          </CardHeader>
          <CardContent><SystemStatus /></CardContent>
        </Card>
      </div>
    </div>
  );
}
