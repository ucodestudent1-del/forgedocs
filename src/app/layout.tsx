import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { ThemeInitializer } from "@/components/theme/ThemeInitializer"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { CookieConsentProvider } from "@/components/ui/cookie-consent"
import { headers } from "next/headers"
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap", weight: ["400", "500", "600", "700"] })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ForgeDocs - Professional Document Management Platform",
    template: "%s | ForgeDocs",
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
    "document workflow",
    "document conversion tools",
  ],
  authors: [{ name: "ForgeDocs", url: appUrl }],
  creator: "ForgeDocs",
  publisher: "ForgeDocs",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      es: "/es",
      fr: "/fr",
      de: "/de",
      zh: "/zh",
      ja: "/ja",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "ForgeDocs",
    title: "ForgeDocs - Professional Document Management Platform",
    description: "Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ForgeDocs - Professional Document Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@forgedocs",
    creator: "@forgedocs",
    title: "ForgeDocs - Professional Document Management",
    description: "Create, organize, generate, and convert documents in the cloud.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE || undefined,
  },
}

async function JsonLdScript() {
  const headersList = await headers()
  const nonce = headersList.get("x-csp-nonce")

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ForgeDocs",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Cloud",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      description: "Professional document management platform for modern teams. Create, organize, generate, and convert documents in the cloud.",
      featureList: [
        "Document management and version control",
        "Format conversion (50+ formats)",
        "Electronic signatures",
        "Template-based document generation",
        "Team collaboration with roles and permissions",
        "AI-powered document assistance",
        "PDF tools (merge, split, compress, OCR)",
        "End-to-end encryption and SOC 2 compliance",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ForgeDocs",
      url: appUrl,
      logo: `${appUrl}/favicon.svg`,
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: appUrl,
      name: "ForgeDocs",
      potentialAction: {
        "@type": "SearchAction",
        target: `${appUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: appUrl,
        },
      ],
    },
  ]

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce || undefined}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://api.forgedocs.com" />
        <link rel="alternate" href={appUrl} hrefLang="en" />
        <link rel="alternate" href={`${appUrl}/es`} hrefLang="es" />
        <link rel="alternate" href={`${appUrl}/fr`} hrefLang="fr" />
        <link rel="alternate" href={`${appUrl}/de`} hrefLang="de" />
        <link rel="alternate" href={`${appUrl}/zh`} hrefLang="zh" />
        <link rel="alternate" href={`${appUrl}/ja`} hrefLang="ja" />
        <link rel="alternate" href={appUrl} hrefLang="x-default" />
        <JsonLdScript />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:px-4 focus-visible:py-2 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:rounded-md focus-visible:outline-none">
          Skip to main content
        </a>
        <ErrorBoundary>
          <ThemeInitializer />
          <ThemeProvider>
            <ToastProvider>
              <CookieConsentProvider>
                <main id="main-content" className="dv-screen">{children}</main>
              </CookieConsentProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
