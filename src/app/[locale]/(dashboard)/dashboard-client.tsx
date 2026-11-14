"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "@/lib/i18n"
import { Search, Bell, ChevronLeft, ChevronRight, Menu, FileText } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { OfflineBanner } from "@/components/ui/offline-banner"
import { useTranslations } from "@/lib/i18n"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const { toast } = useToast()
  const pathname = usePathname()
  const locale = useLocale()
  const isRtl = locale === "ar"
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/documents?search=${encodeURIComponent(value)}`)
        const data = await res.json()
        setSearchResults(data.documents || [])
      } catch {
        setSearchResults([])
        toast({ title: "Search failed", variant: "destructive" })
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const headerAriaLabel = sidebarCollapsed
    ? t("sidebar.expand" as any)
    : t("sidebar.collapse" as any)
  const mobileMenuAriaLabel = t("sidebar.open" as any)

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={isRtl ? "rtl" : "ltr"}>
      <OfflineBanner />
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
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    const first = searchResults[0]
                    if (first.id) {
                      window.location.href = `/${locale}/documents/${first.id}`
                    }
                  }
                }}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchLoading && (
                <div className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 animate-spin">
                  <svg className="h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {searchResults.length > 0 && !searchLoading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-input rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        window.location.href = `/${locale}/documents/${doc.id}`
                        setSearchQuery("")
                        setSearchResults([])
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
