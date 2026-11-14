import { Metadata } from "next"
import Link from "next/link"
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

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
}

export async function generateStaticParams() {
  return [
    { locale: "en" },
    { locale: "es" },
    { locale: "ar" },
    { locale: "fr" },
    { locale: "de" },
    { locale: "ja" },
    { locale: "zh" },
  ]
}

export default async function NotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const messages = messagesMap[locale] || messagesEn

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
        <body>
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-foreground">404</h1>
              <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
              <p className="mt-2 text-muted-foreground">The page you're looking for doesn't exist.</p>
              <Link
                href={`/${locale}`}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Go home
              </Link>
            </div>
          </div>
        </body>
      </html>
    </NextIntlClientProvider>
  )
}