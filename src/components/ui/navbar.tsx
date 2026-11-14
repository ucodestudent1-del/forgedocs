"use client"

import { useState } from "react"
import { X, Menu, Globe, ChevronDown, Check } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter, usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const locales = [
  { code: "en", name: "English", nativeName: "English", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "fr", name: "French", nativeName: "Français", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", rtl: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", rtl: false },
  { code: "zh", name: "Chinese", nativeName: "中文", rtl: false },
] as const

export function Navbar() {
  const t = useTranslations("navigation")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentLocale = pathname.split("/")[1] || "en"
  const currentLanguage = locales.find((l) => l.code === currentLocale) || locales[0]

  const handleLocaleChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`)
    router.push(newPath)
    router.refresh()
  }

  const navLinks = [
    { href: `/${currentLocale}`, label: t("dashboard") },
    { href: `/${currentLocale}#features`, label: t("documents") },
    { href: `/${currentLocale}#solutions`, label: t("solutions") },
    { href: `/${currentLocale}#testimonials`, label: t("testimonials") },
    { href: `/${currentLocale}#pricing`, label: t("pricing") },
    { href: `/${currentLocale}#faq`, label: t("faq") },
  ]

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only">
        Skip to content
      </a>

      <nav className="fixed top-0 w-full z-50 border-b border-input bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <a href={`/${currentLocale}`} className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">ForgeDocs</span>
              </a>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label={tCommon("language")}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline-flex">{currentLanguage.nativeName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {locales.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      className="flex items-center gap-2"
                      onClick={() => handleLocaleChange(l.code)}
                      role="menuitemradio"
                      aria-checked={l.code === currentLocale}
                    >
                      <span className="flex-1 text-left" dir={l.rtl ? "rtl" : "ltr"}>
                        {l.nativeName}
                      </span>
                      {l.code === currentLocale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-12 space-y-6 p-6 text-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-lg font-medium text-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-6 border-t border-input">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full justify-center"
                    aria-label={tCommon("language")}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{currentLanguage.nativeName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {locales.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      className="flex items-center gap-2"
                      onClick={() => {
                        handleLocaleChange(l.code)
                        setMobileOpen(false)
                      }}
                      role="menuitemradio"
                      aria-checked={l.code === currentLocale}
                    >
                      <span className="flex-1 text-left" dir={l.rtl ? "rtl" : "ltr"}>
                        {l.nativeName}
                      </span>
                      {l.code === currentLocale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}