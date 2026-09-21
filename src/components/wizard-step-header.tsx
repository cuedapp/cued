"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WizardStepContent({
  configured,
  summary,
  children,
}: {
  configured: boolean;
  summary: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("Wizard");
  const [editing, setEditing] = useState(!configured);

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-emerald-600" />
            {t("summary.configured")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            {t("buttons.edit")}
          </Button>
        </CardHeader>
        <CardContent>{summary}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
