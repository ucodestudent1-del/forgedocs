"use client"

import { createContext, useContext, useState, ReactNode } from "react"

import messagesEn from "@/messages/en.json"
import messagesEs from "@/messages/es.json"
import messagesAr from "@/messages/ar.json"
import messagesFr from "@/messages/fr.json"
import messagesDe from "@/messages/de.json"
import messagesJa from "@/messages/ja.json"
import messagesZh from "@/messages/zh.json"

const messagesMap: Record<string, Record<string, unknown>> = {
  en: messagesEn,
  es: messagesEs,
  ar: messagesAr,
  fr: messagesFr,
  de: messagesDe,
  ja: messagesJa,
  zh: messagesZh,
}

const locales = ["en", "es", "ar", "fr", "de", "ja", "zh"]
const defaultLocale = "en"

interface I18nContextType {
  locale: string
  messages: Record<string, unknown>
  setLocale: (locale: string) => void
  t: (key: string) => string
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

  const t = (key: string): string => {
    const keys = key.split(".")
    let value: any = messages
    for (const k of keys) {
      value = value?.[k]
    }
    return typeof value === "string" ? value : key
  }

  return (
    <I18nContext.Provider value={{ locale: currentLocale, messages, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslations(namespace: string) {
  const { t } = useContext(I18nContext)
  if (!t) throw new Error("useTranslations must be used within I18nProvider")

  return (key: string) => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    return t(fullKey)
  }
}

export function useLocale() {
  const { locale } = useContext(I18nContext)
  if (!locale) throw new Error("useLocale must be used within I18nProvider")
  return locale
}