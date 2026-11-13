import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Shield, Settings, TrendingUp, Users, CreditCard, FileText, AlertTriangle, Clock, Download, Search, Filter, Activity } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TEMPORARILY DISABLED: Auth check removed for development
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: TrendingUp },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
    { href: "/admin/system-health", label: "System Health", icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">ForgeDocs Admin</h1>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Back to App
            </Link>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}