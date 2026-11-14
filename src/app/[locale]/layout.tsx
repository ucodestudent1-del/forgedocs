import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { routing } from "@/i18n/routing"

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params
  const messages = await getMessages({ locale })
  const isRtl = locale === "ar"

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}