import defineConfig from "next-intl/config"

export default defineConfig({
  routing: "./routing.ts",
  locales: ["en", "es", "ar", "fr", "de", "ja", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
})