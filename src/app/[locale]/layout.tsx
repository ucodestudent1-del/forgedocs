import { I18nProvider } from "@/lib/i18n"

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params
  const isRtl = locale === "ar"

  return (
    <I18nProvider locale={locale}>
      <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen">
        {children}
      </div>
    </I18nProvider>
  )
}