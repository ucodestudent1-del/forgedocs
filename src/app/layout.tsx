import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { ThemeInitializer } from "@/components/theme/ThemeInitializer"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { CookieConsentProvider } from "@/components/ui/cookie-consent"
import { headers } from "next/headers"
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"

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
  ],
  authors: [{ name: "ForgeDocs" }],
  creator: "ForgeDocs",
  publisher: "ForgeDocs",
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
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "google-site-verification-code",
  },
}

async function JsonLdScript() {
  const headersList = await headers()
  const nonce = headersList.get("x-csp-nonce")

  const jsonLd = {
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
  }

  return (
    <script
      type="application/ld+json"
      nonce={nonce || undefined}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
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
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://api.forgedocs.com" />
        <JsonLdScript />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        <ErrorBoundary>
          <ThemeInitializer />
          <ThemeProvider>
            <ToastProvider>
              <CookieConsentProvider>{children}</CookieConsentProvider>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
