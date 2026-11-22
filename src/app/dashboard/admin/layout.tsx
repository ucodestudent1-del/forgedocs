import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Shield, Settings, TrendingUp, Users, CreditCard, FileText, AlertTriangle, Clock, Download, Search, Filter, Activity, Home } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { getRouteClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin"].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-4">403</h1>
          <p className="mt-4 text-lg text-muted-foreground mb-8">
            Access Denied — Admin privileges required.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

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
              Dashboard
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