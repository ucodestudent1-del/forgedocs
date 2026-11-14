/** @type {import('next-intl/config').Config} */
module.exports = {
  routing: "./src/i18n/routing.ts",
  locales: ["en", "es", "ar", "fr", "de", "ja", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
}