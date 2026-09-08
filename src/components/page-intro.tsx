import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className={action ? "flex flex-col justify-between gap-5 sm:flex-row sm:items-end" : "max-w-3xl"}>
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}
