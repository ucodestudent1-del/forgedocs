import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Shield, Settings, TrendingUp, Users, CreditCard, FileText, AlertTriangle, Clock, Download, Search, Filter, Activity } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useTranslations } from "@/lib/i18n"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("navigation")
  const tCommon = useTranslations("common")

  // TEMPORARILY DISABLED: Auth check removed for development
  const navItems = [
    { href: "/admin", labelKey: "dashboard", icon: TrendingUp },
    { href: "/admin/users", labelKey: "users", icon: Users },
    { href: "/admin/subscriptions", labelKey: "subscriptions", icon: CreditCard },
    { href: "/admin/audit-logs", labelKey: "auditLogs", icon: FileText },
    { href: "/admin/system-health", labelKey: "systemHealth", icon: Activity },
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
              {t("dashboard")}
            </Link>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <item.icon className="h-4 w-4" />
                {t(item.labelKey as any)}
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