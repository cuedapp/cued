import { getRequestConfig } from "next-intl/server";
import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale } from "./config";

export default getRequestConfig(async ({ locale: localeOverride }) => {
  const requested = localeOverride ?? (await rootParams.locale());
  if (!isLocale(requested)) notFound();

  const locale = requested;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
