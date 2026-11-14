"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "@/lib/i18n"
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  FilePen,
  FileStack,
  Wrench,
  RefreshCw,
  Bot,
  FileSignature,
  FileImage,
  PenTool,
  Share2,
  History,
  Bell,
  CreditCard,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  X,
  Home,
  Upload,
  Download,
  Search,
  Zap,
  Shield,
  Users,
  Archive,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface NavItem {
  href: string
  labelKey: string
  icon: React.ElementType
  badge?: string
  children?: NavItem[]
}

interface NavSection {
  titleKey: string
  icon?: React.ElementType
  items: NavItem[]
}

export function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  userEmail,
  userInitial = "U",
}: {
  isOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  userEmail?: string | null
  userInitial?: string
}) {
  const t = useTranslations("navigation")
  const tCommon = useTranslations("common")
  const pathname = usePathname()
  const locale = useLocale()
  const isRtl = locale === "ar"
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { toast } = useToast()

  const NAV_SECTIONS: NavSection[] = [
    {
      titleKey: "workspace",
      icon: Home,
      items: [
        { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
        { href: "/documents", labelKey: "documents", icon: FileText },
        { href: "/files", labelKey: "myFiles", icon: FolderOpen },
        { href: "/editor", labelKey: "editor", icon: FilePen },
        { href: "/templates", labelKey: "templates", icon: FileStack },
        { href: "/tools", labelKey: "tools", icon: Wrench },
      ],
    },
    {
      titleKey: "conversionAI",
      icon: Zap,
      items: [
        { href: "/conversion", labelKey: "conversion", icon: RefreshCw },
        { href: "/ai-assistant", labelKey: "aiAssistant", icon: Bot },
        { href: "/pdf-tools", labelKey: "pdfTools", icon: FileImage },
        { href: "/e-signatures", labelKey: "eSignatures", icon: FileSignature },
      ],
    },
    {
      titleKey: "manage",
      icon: Users,
      items: [
        { href: "/shared", labelKey: "shared", icon: Share2 },
        { href: "/activity", labelKey: "activity", icon: History },
        { href: "/notifications", labelKey: "notifications", icon: Bell, badge: "3" },
        { href: "/usage", labelKey: "usage", icon: CreditCard },
      ],
    },
    {
      titleKey: "other",
      icon: Shield,
      items: [
        { href: "/settings", labelKey: "settings", icon: Settings },
        { href: "/help", labelKey: "help", icon: HelpCircle },
      ],
    },
  ]

  useEffect(() => {
    setExpandedSections(NAV_SECTIONS.map((s) => s.titleKey))
  }, [])

  useEffect(() => {
    if (pathname) onClose()
  }, [pathname, onClose])

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "create":
        window.location.href = "/document-generator"
        break
      case "convert":
        window.location.href = "/conversion"
        break
      case "merge":
        window.location.href = "/pdf-tools?tool=merge"
        break
      case "ai-generate":
        window.location.href = "/ai-assistant"
        break
      default:
        break
    }
    onClose()
  }

  if (!isOpen && typeof window !== "undefined" && window.innerWidth < 1024) {
    return null
  }

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed lg:static left-0 top-0 z-50 h-full border-r bg-card flex flex-col transition-all duration-300 ease-in-out lg:z-auto
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        <div className="flex items-center justify-between h-16 px-3 border-b">
          <div className="flex items-center gap-2">
            {!collapsed && (
              <span className="font-bold text-lg tracking-tight text-primary">
                ForgeDocs
              </span>
            )}
            {collapsed && (
              <span className="font-bold text-lg tracking-tight text-primary">F</span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={t("sidebar.close" as any)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label={t("sidebar.expand" as any)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => {
            const isExpanded = expandedSections.includes(section.titleKey)
            return (
              <div key={section.titleKey} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.titleKey)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors`}
                  aria-expanded={isExpanded}
                >
                  {section.icon && (
                    <section.icon className={`h-4 w-4 ${collapsed ? "mx-auto" : ""}`} />
                  )}
                  {!collapsed && t(section.titleKey as any)}
                  {!collapsed && (
                    <span className="ml-auto flex items-center gap-1">
                      {isExpanded ? (
                        <ChevronDown className={`h-4 w-4 transition-transform ${isRtl ? "rtl-flip" : ""}`} />
                      ) : (
                        <ChevronRight className={`h-4 w-4 transition-transform ${isRtl ? "rtl-flip" : ""}`} />
                      )}
                    </span>
                  )}
                </button>

                <div
                  className={`${
                    isExpanded && !collapsed ? "block" : "hidden"
                  } animate-slide-down overflow-hidden`}
                  style={{ maxHeight: isExpanded && !collapsed ? "500px" : "0" }}
                >
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        onClose()
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 flex-shrink-0 ${
                          isActive(item.href) ? "text-primary" : ""
                        } ${collapsed ? "mx-auto" : ""}`}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate">{t(item.labelKey as any)}</span>
                          {item.badge && (
                            <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="pt-4 border-t space-y-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("quickActions")}
            </p>
            <div className="px-2 space-y-1">
              <button
                onClick={() => handleQuickAction("create")}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                }`}
              >
                <FilePen className={`h-5 w-5 ${collapsed ? "mx-0" : ""}`} />
                {!collapsed && <span>{t("createDocument")}</span>}
              </button>
              <button
                onClick={() => handleQuickAction("convert")}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                }`}
              >
                <RefreshCw className={`h-5 w-5 ${collapsed ? "mx-0" : ""}`} />
                {!collapsed && <span>{t("convertFile")}</span>}
              </button>
              <button
                onClick={() => handleQuickAction("merge")}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                }`}
              >
                <FileImage className={`h-5 w-5 ${collapsed ? "mx-0" : ""}`} />
                {!collapsed && <span>{t("mergePDFs")}</span>}
              </button>
              <button
                onClick={() => handleQuickAction("ai-generate")}
                className={`w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                }`}
              >
                <Bot className={`h-5 w-5 ${collapsed ? "mx-0" : ""}`} />
                {!collapsed && <span>{t("aiGenerate")}</span>}
              </button>
            </div>
          </div>
        </nav>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userEmail || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{t("sidebar.signedIn" as any)}</p>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {!collapsed && (
              <Link
                href="/settings"
                onClick={() => onClose()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                {tCommon("settings")}
              </Link>
            )}
            {collapsed && (
              <button
                onClick={() => onClose()}
                className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label={tCommon("settings")}
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => {
                window.location.href = "/api/auth/signout"
              }}
              className={`p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${
                collapsed ? "mx-auto" : ""
              }`}
              aria-label={tCommon("signOut")}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 0.2s ease-out; }
      `}</style>
    </>
  )
}