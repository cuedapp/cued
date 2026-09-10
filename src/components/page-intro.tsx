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
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tighter sm:text-5xl">{title}</h1>
        <p className="mt-4 leading-6 text-muted-foreground sm:leading-7">{description}</p>
      </div>
      {action}
    </header>
  );
}
