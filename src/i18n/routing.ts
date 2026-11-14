import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "es", "ar", "fr", "de", "ja", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
})