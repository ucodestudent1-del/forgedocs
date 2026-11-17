import { Metadata } from "next"
import { I18nProvider } from "@/lib/i18n"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"

const localeNames: Record<string, string> = {
  en: "English",
  es: "Español",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  zh: "中文",
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  const localeName = localeNames[locale] || locale

  return {
    title: {
      default: `ForgeDocs - Professional Document Management`,
      template: `%s | ForgeDocs`,
    },
    description: "Create, organize, generate, and convert documents in the cloud. One platform for every document workflow. SOC 2 compliant, end-to-end encrypted, GDPR ready.",
    keywords: [
      "document management",
      "document conversion",
      "e-signatures",
      "team collaboration",
      "SOC 2",
      "GDPR",
      "document automation",
      "PDF tools",
      "document generation",
      "cloud storage",
    ],
    alternates: {
      languages: {
        en: "https://forgedocs.com/en",
        es: "https://forgedocs.com/es",
        ar: "https://forgedocs.com/ar",
        fr: "https://forgedocs.com/fr",
        de: "https://forgedocs.com/de",
        ja: "https://forgedocs.com/ja",
        zh: "https://forgedocs.com/zh",
        "x-default": "https://forgedocs.com",
      },
    },
    openGraph: {
      locale,
      type: "website",
      url: `https://forgedocs.com/${locale}`,
      siteName: "ForgeDocs",
      title: `ForgeDocs - Professional Document Management (${localeNames[locale]})`,
      description: "Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "ForgeDocs - Professional Document Management",
        },
      ],
    },
  }
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
  const isRtl = locale === "ar"

  return (
    <ErrorBoundary>
      <I18nProvider locale={locale}>
        <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className="min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
          >
            Skip to main content
          </a>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </I18nProvider>
    </ErrorBoundary>
  )
}