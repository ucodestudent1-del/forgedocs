export const locales = ["en", "es", "ar", "fr", "de", "ja", "zh", "zh-TW"] as const
export const defaultLocale = "en" as const

export type Locale = (typeof locales)[number]

export const localeLabels: Record<Locale, { name: string; nativeName: string; rtl: boolean }> = {
  en: { name: "English", nativeName: "English", rtl: false },
  es: { name: "Spanish", nativeName: "Español", rtl: false },
  ar: { name: "Arabic", nativeName: "العربية", rtl: true },
  fr: { name: "French", nativeName: "Français", rtl: false },
  de: { name: "German", nativeName: "Deutsch", rtl: false },
  ja: { name: "Japanese", nativeName: "日本語", rtl: false },
  zh: { name: "Chinese (Simplified)", nativeName: "中文（简体）", rtl: false },
  "zh-TW": { name: "Chinese (Traditional)", nativeName: "中文（繁體）", rtl: false },
}
export function isRtl(locale: string): boolean {
  return locale === "ar"
}
