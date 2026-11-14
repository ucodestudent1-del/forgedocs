import { NextIntlClientProvider } from "next-intl"

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

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params
  const messages = messagesMap[locale] || messagesEn
  const isRtl = locale === "ar"

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}