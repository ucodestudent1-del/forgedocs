"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Menu,
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
  items: NavItem[]
  icon?: React.ElementType
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    icon: Home,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/files", label: "My Files", icon: FolderOpen },
      { href: "/editor", label: "Document Editor", icon: FilePen },
      { href: "/templates", label: "Templates", icon: FileStack },
      { href: "/tools", label: "Tools", icon: Wrench },
    ],
  },
  {
    title: "Conversion & AI",
    icon: Zap,
    items: [
      { href: "/conversion", label: "Conversion", icon: RefreshCw },
      { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
      { href: "/pdf-tools", label: "PDF Tools", icon: FileImage },
      { href: "/e-signatures", label: "E-Signatures", icon: FileSignature },
    ],
  },
  {
    title: "Manage",
    icon: Users,
    items: [
      { href: "/shared", label: "Shared Documents", icon: Share2 },
      { href: "/activity", label: "Activity History", icon: History },
      { href: "/notifications", label: "Notifications", icon: Bell, badge: "3" },
      { href: "/usage", label: "Usage & Limits", icon: CreditCard },
    ],
  },
  {
    title: "Other",
    icon: Shield,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/help", label: "Help & Support", icon: HelpCircle },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string | null
  userInitial?: string
}

export function Sidebar({ isOpen, onClose, userEmail, userInitial = "U" }: SidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(
    NAV_SECTIONS.map((s) => s.title)
  )
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const { toast } = useToast()

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

  if (!isOpen) {
    return (
      <>
        <button
          onClick={() => onClose()}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />

      <aside className="fixed lg:static left-0 top-0 z-50 h-full w-64 border-r bg-card flex flex-col transition-transform duration-200 ease-in-out lg:z-auto">
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-primary">ForgeDocs</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => {
            const isExpanded = expandedSections.includes(section.title)
            return (
              <div key={section.title} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  aria-expanded={isExpanded}
                >
                  {section.icon && <section.icon className="h-4 w-4" />}
                  {section.title}
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
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.href) ? "text-primary" : ""}`} />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="pt-4 border-t space-y-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
            <div className="px-2 space-y-1">
              <button
                onClick={() => handleQuickAction("create")}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <FilePen className="h-5 w-5" />
                Create Document
              </button>
              <button
                onClick={() => handleQuickAction("convert")}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Convert File
              </button>
              <button
                onClick={() => handleQuickAction("merge")}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <FileImage className="h-5 w-5" />
                Merge PDFs
              </button>
              <button
                onClick={() => handleQuickAction("ai-generate")}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Bot className="h-5 w-5" />
                AI Generate
              </button>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userEmail || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">Signed in</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                window.location.href = "/api/auth/signout"
              }}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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