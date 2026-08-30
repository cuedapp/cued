"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function BackButton() { const t = useTranslations("Common"); const router = useRouter(); return <button type="button" onClick={() => router.back()} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("back")}</button>; }
