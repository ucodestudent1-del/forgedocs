"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Search, Bell, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { useTranslations } from "next-intl"

interface DashboardClientProps {
  userEmail: string | null
  userInitial: string
  children: React.ReactNode
}

export default function DashboardClient({
  userEmail,
  userInitial,
  children,
}: DashboardClientProps) {
  const t = useTranslations("navigation")
  const tCommon = useTranslations("common")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { toast } = useToast()
  const pathname = usePathname()
  const locale = useLocale()
  const isRtl = locale === "ar"

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const headerAriaLabel = sidebarCollapsed
    ? t("sidebar.expand" as any)
    : t("sidebar.collapse" as any)
  const mobileMenuAriaLabel = t("sidebar.open" as any)

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        userEmail={userEmail}
        userInitial={userInitial}
      />

      <div className="flex-1 overflow-hidden relative">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed lg:static top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
            aria-label={t("sidebar.expand" as any)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <header className="flex items-center justify-between h-16 px-4 border-b bg-background/50 backdrop-blur md:px-6 lg:px-8" dir={isRtl ? "rtl" : "ltr"}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={mobileMenuAriaLabel}
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="hidden lg:flex p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={headerAriaLabel}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>

            <div className="relative w-full md:w-96 lg:w-80">
              <Search
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                  isRtl ? "right-3 rtl-flip" : "left-3"
                }`}
              />
              <input
                type="search"
                placeholder={tCommon("header.searchPlaceholder" as any)}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Bell className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer relative" aria-label={tCommon("header.notifications" as any)} />
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {userInitial}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" dir={isRtl ? "rtl" : "ltr"}>
          {children}
        </main>
      </div>
    </div>
  )
}