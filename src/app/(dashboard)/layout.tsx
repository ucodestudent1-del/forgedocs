import Link from "next/link"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  FileText,
  File,
  FileSpreadsheet,
  RefreshCw,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  ChevronRight,
} from "lucide-react"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/templates", label: "Templates", icon: File },
  { href: "/conversion", label: "Conversion", icon: RefreshCw },
  { href: "/billing", label: "Billing", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ email: string | null } | null>(null)

  useEffect(() => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: () => cookies() }
    )
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? null } : null)
    })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 border-r bg-card transition-transform duration-300 transform -translate-x-full sm:translate-x-0 z-30 md:relative ${sidebarOpen ? "translate-x-0" : ""}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              F
            </div>
            <span className="font-bold text-lg tracking-tight text-primary">ForgeDocs</span>
          </div>
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-primary"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <div className="w-6 h-0.5 bg-current"></div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
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
              {user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.email || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">Signed in</p>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              // Sign out would redirect to auth
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 border-b bg-background/50 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <div className="w-6 h-6 flex flex-col gap-1.5">
                <div className="h-[2px] w-full bg-current rounded"></div>
                <div className="h-[2px] w-full bg-current rounded"></div>
                <div className="h-[2px] w-full bg-current rounded"></div>
              </div>
            </button>
            <h1 className="text-xl font-semibold tracking-tight">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search documents..."
                className="h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
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

function getPageTitle() {
  if (typeof window === "undefined") return "Dashboard"
  const path = window.location.pathname
  if (path === "/dashboard") return "Dashboard"
  if (path === "/documents") return "Documents"
  if (path === "/templates") return "Templates"
  if (path === "/conversion") return "Conversion"
  if (path === "/billing") return "Billing"
  return "ForgeDocs"
}
