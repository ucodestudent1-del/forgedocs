"use client"

import { useTheme } from "./ThemeProvider"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg" role="group" aria-label="Theme selection">
      {[
        { value: "light", icon: Sun, label: "Light mode" },
        { value: "system", icon: Monitor, label: "System preference" },
        { value: "dark", icon: Moon, label: "Dark mode" },
      ].map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="icon"
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}