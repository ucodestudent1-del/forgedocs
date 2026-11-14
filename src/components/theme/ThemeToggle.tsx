"use client"

import { useTheme } from "./ThemeProvider"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/lib/i18n"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations("common")

  const themes = [
    { value: "light" as const, icon: Sun, labelKey: "light" as const },
    { value: "system" as const, icon: Monitor, labelKey: "system" as const },
    { value: "dark" as const, icon: Moon, labelKey: "dark" as const },
  ] as const

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg" role="group" aria-label={t("theme" as any)}>
      {themes.map(({ value, icon: Icon, labelKey }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="icon"
          onClick={() => setTheme(value)}
          aria-label={t(labelKey as any)}
          aria-pressed={theme === value}
          title={t(labelKey as any)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}