"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  File,
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Search,
  Bell,
  User,
} from "lucide-react"
import { SignOutButton } from "@/components/SignOutButton"
import { DashboardHeader, MobileSidebar } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/documents", label: "Documents", Icon: FileText },
  { href: "/templates", label: "Templates", Icon: File },
  { href: "/conversion", label: "Conversion", Icon: RefreshCw },
  { href: "/billing", label: "Billing", Icon: Settings },
]

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { toast } = useToast()
  const pathname = usePathname()

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 border-r bg-card z-30">
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-primary">ForgeDocs</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{userEmail || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">Signed in</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:absolute lg:top-4 lg:left-4 lg:z-50 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="h-5 w-5">≡</span>
        </button>

        <header className="flex items-center justify-between h-16 px-6 border-b bg-background/50 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <Search className="hidden lg:block absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search documents..."
              className="lg:pl-9 h-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
            <Bell className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
