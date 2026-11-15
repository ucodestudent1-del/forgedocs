import { I18nProvider } from "@/lib/i18n"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

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
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </I18nProvider>
  )
}
