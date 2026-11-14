"use client"

import { useTranslations } from "@/lib/i18n"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Globe, ChevronDown, Check } from "lucide-react"
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

export function LanguageSwitcher() {
  const t = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  const currentLocale = pathname.split("/")[1] || "en"
  const currentLanguage = locales.find((l) => l.code === currentLocale) || locales[0]

  const handleLocaleChange = (locale: string) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${locale}`)
    router.push(newPath)
    router.refresh()
  }

  if (!mounted) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={t("language")}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-flex">{currentLanguage.nativeName}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            className="flex items-center gap-2"
            onClick={() => handleLocaleChange(locale.code)}
            role="menuitemradio"
            aria-checked={locale.code === currentLocale}
          >
            <span className="flex-1 text-left" dir={locale.rtl ? "rtl" : "ltr"}>
              {locale.nativeName}
            </span>
            {locale.code === currentLocale && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageSwitcherClient() {
  const [mounted, setMounted] = useState(false)
  if (!mounted) return null
  return <LanguageSwitcher />
}