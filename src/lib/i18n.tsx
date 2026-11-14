"use client"

import { createContext, useContext, useState, ReactNode } from "react"

import messagesEn from "@/messages/en.json"
import messagesEs from "@/messages/es.json"
import messagesAr from "@/messages/ar.json"
import messagesFr from "@/messages/fr.json"
import messagesDe from "@/messages/de.json"
import messagesJa from "@/messages/ja.json"
import messagesZh from "@/messages/zh.json"
import messagesZhTw from "@/messages/zh-tw.json"

const messagesMap: Record<string, Record<string, unknown>> = {
  en: messagesEn,
  es: messagesEs,
  ar: messagesAr,
  fr: messagesFr,
  de: messagesDe,
  ja: messagesJa,
  zh: messagesZh,
  "zh-TW": messagesZhTw,
}

const locales = ["en", "es", "ar", "fr", "de", "ja", "zh", "zh-TW"]
const defaultLocale = "en"

// Number formats per locale (e.g. Arabic-Indic digits for ar-SA)
const numberFormatLocales: Record<string, string> = {
  ar: "ar-SA",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
  zh: "zh-CN",
  "zh-TW": "zh-TW",
}

const numberFormatOptions: Intl.NumberFormatOptions = { useGrouping: true }

interface I18nContextType {
  locale: string
  messages: Record<string, unknown>
  setLocale: (locale: string) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  formatNumber: (value: number) => string
  formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children, locale = defaultLocale }: { children: ReactNode; locale?: string }) {
  const [currentLocale, setCurrentLocale] = useState(locale)
  const messages = messagesMap[currentLocale] || messagesEn

  const setLocale = (newLocale: string) => {
    setCurrentLocale(newLocale)
    if (typeof document !== "undefined") {
      document.cookie = `locale=${newLocale}; path=/; max-age=31536000`
    }
  }

  const resolve = (key: string): string | undefined => {
    const keys = key.split(".")
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return typeof value === "string" ? value : undefined
  }

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let value = resolve(key)
    if (!value) return key
    if (vars) {
      for (const [varName, varValue] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${varName}\\}`, "g"), String(varValue))
      }
    }
    return value
  }

  const formatNumber = (value: number): string => {
    const locale = numberFormatLocales[currentLocale] || numberFormatLocales[defaultLocale]
    return new Intl.NumberFormat(locale, numberFormatOptions).format(value)
  }

  const formatDate = (value: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof value === "string" ? new Date(value) : value
    return new Intl.DateTimeFormat(currentLocale, options).format(d)
  }

  return (
    <I18nContext.Provider value={{ locale: currentLocale, messages, setLocale, t, formatNumber, formatDate }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslations(namespaces: string | string[]) {
  const { t, messages } = useContext(I18nContext) as I18nContextType
  if (!t) throw new Error("useTranslations must be used within I18nProvider")

  const nsList = Array.isArray(namespaces) ? namespaces : [namespaces]

  function resolveInMessages(key: string): unknown {
    const keys = key.split(".")
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return value
  }

  return (key: string, vars?: Record<string, string | number>) => {
    // Try each namespace in order
    for (const ns of nsList) {
      const fullKey = `${ns}.${key}`
      const value = resolveInMessages(fullKey)
      if (typeof value === "string") return t(fullKey, vars)
    }
    // Fallback: try key directly
    return t(key, vars)
  }
}

export function useLocale() {
  const { locale } = useContext(I18nContext) as I18nContextType
  if (!locale) throw new Error("useLocale must be used within I18nProvider")
  return locale
}

export function useFormatNumber() {
  const { formatNumber } = useContext(I18nContext) as I18nContextType
  if (!formatNumber) throw new Error("useFormatNumber must be used within I18nProvider")
  return formatNumber
}

export { locales, defaultLocale }
