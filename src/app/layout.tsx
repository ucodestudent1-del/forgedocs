import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "@/app/env-check"
import { Toast } from "@/components/ui/use-toast"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

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
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var stored = localStorage.getItem("theme");
              var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
              var shouldBeDark = false;
              if (stored === "dark") shouldBeDark = true;
              else if (stored === "light") shouldBeDark = false;
              else if (stored === "system" || stored === null) shouldBeDark = prefersDark;
              document.documentElement.classList.toggle("dark", shouldBeDark);
            } catch (e) {}
          })();
        `}} />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}>
        <ThemeProvider>
          <Toast>{children}</Toast>
        </ThemeProvider>
      </body>
    </html>
  )
}