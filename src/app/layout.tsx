import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/app/env-check"
import { Toast } from "@/components/ui/use-toast"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { ThemeInitializer } from "@/components/theme/ThemeInitializer"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "ForgeDocs",
  description: "Professional document management platform",
  icons: {
    icon: "/favicon.svg",
  },
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
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        <ThemeInitializer />
        <ThemeProvider>
          <Toast>{children}</Toast>
        </ThemeProvider>
      </body>
    </html>
  )
}