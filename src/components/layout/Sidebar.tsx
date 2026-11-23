"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  label: string
  icon: React.ElementType
  badge?: string
  children?: NavItem[]
}

interface NavSection {
  title: string
  icon?: React.ElementType
  items: NavItem[]
}

export function Sidebar({
  isOpen,
  onClose,
  userEmail,
  userInitial = "U",
}: {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userInitial?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { toast } = useToast()

  const NAV_SECTIONS: NavSection[] = [
    {
      title: "Workspace",
      icon: Home,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/documents", label: "Documents", icon: FileText },
        { href: "/dashboard/files", label: "My Files", icon: FolderOpen },
        { href: "/editor", label: "Editor", icon: FilePen },
        { href: "/dashboard/templates", label: "Templates", icon: FileStack },
        { href: "/dashboard/tools", label: "Tools", icon: Wrench },
      ],
    },
    {
      title: "Conversion & AI",
      icon: Zap,
      items: [
        { href: "/dashboard/conversion", label: "Conversion", icon: RefreshCw },
        { href: "/dashboard/ai-assistant", label: "AI Assistant", icon: Bot },
        { href: "/dashboard/pdf-tools", label: "PDF Tools", icon: FileImage },
        { href: "/dashboard/e-signatures", label: "E-Signatures", icon: FileSignature },
      ],
    },
    {
      title: "Manage",
      icon: Users,
      items: [
        { href: "/dashboard/shared", label: "Shared", icon: Share2 },
        { href: "/dashboard/activity", label: "Activity", icon: History },
        { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: "3" },
        { href: "/dashboard/usage", label: "Usage", icon: CreditCard },
      ],
    },
    {
      title: "Other",
      icon: Shield,
      items: [
        { href: "/dashboard/settings", label: "Settings", icon: Settings },
        { href: "/help", label: "Help", icon: HelpCircle },
      ],
    },
  ]

  useEffect(() => {
    setExpandedSections(NAV_SECTIONS.map((s) => s.title))
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

  if (!isOpen && typeof window !== "undefined" && window.innerWidth < 1024) {
    return null
  }

  return (
    <>
      {isOpen && typeof window !== "undefined" && window.innerWidth < 1024 ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className="fixed lg:static left-0 top-0 z-50 h-full border-r bg-card flex flex-col lg:z-auto w-64"
      >
        <div className="flex items-center justify-between h-16 px-3 border-b">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-primary">
              ForgeDocs
            </span>
          </div>
          {typeof window !== "undefined" && window.innerWidth < 1024 ? (
            <button
              onClick={onClose}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => {
            const isExpanded = expandedSections.includes(section.title)
            return (
              <div key={section.title} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors`}
                  aria-expanded={isExpanded}
                >
                  {section.icon && (
                    <section.icon className="h-4 w-4" />
                  )}
                  <span className="flex-1 text-left">{section.title}</span>
                  <span className="ml-auto flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform" />
                    )}
                  </span>
                </button>

                <div
                  className={`${isExpanded ? "block" : "hidden"} animate-slide-down overflow-hidden`}
                  style={{ maxHeight: isExpanded ? "500px" : "0" }}
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
                        }`}
                      />
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {userEmail || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">Signed in</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/login", { method: "DELETE" })
                } catch {
                  // ignore
                }
                router.push("/auth/login")
              }}
              className={`p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`}
              aria-label="Sign out"
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
