import { Metadata } from "next"
import Link from "next/link"
import { getMessages } from "next-intl/server"
import { NextIntlClientProvider } from "next-intl"
import { routing } from "@/i18n/routing"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function NotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const messages = await getMessages({ locale })

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