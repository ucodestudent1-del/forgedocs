"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface DashboardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  showSearch?: boolean
}

export function DashboardHeader({
  title,
  description,
  action,
  showSearch = true,
}: DashboardHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { toast } = useToast()

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-input bg-background/50 backdrop-blur px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-end justify-between gap-4 w-full lg:w-auto">
        {showSearch && (
          <div className="relative w-full md:w-64">
            <input
              type="search"
              placeholder="Search..."
              className="h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}
        {action}
      </div>
    </div>
  )
}

export function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 bg-background lg:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm onClick={onClose}" />
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r shadow-xl transform transition-transform">
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-primary">ForgeDocs</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-md text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { href: "/dashboard", label: "Dashboard", icon: "Dashboard" },
            { href: "/documents", label: "Documents", icon: "FileText" },
            { href: "/templates", label: "Templates", icon: "File" },
            { href: "/conversion", label: "Conversion", icon: "RefreshCw" },
            { href: "/billing", label: "Billing", icon: "Settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors block"
            >
              <span className="h-5 w-5">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link
            href="/auth/login"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-lg block"
          >
            <span className="h-5 w-5">🚪</span>
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}
