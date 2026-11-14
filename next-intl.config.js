/** @type {import('next-intl/config').Config} */
const { locales, defaultLocale } = require("./src/i18n/locales")

module.exports = {
  locales,
  defaultLocale,
  localePrefix: "as-needed",
}