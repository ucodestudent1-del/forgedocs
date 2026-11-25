import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, FileText, AlertTriangle, TrendingUp, Clock, Download, Search, Shield, Mail, MoreHorizontal, UserPlus } from "lucide-react"
import Link from "next/link"
import { getPooledRouteClient } from "@/lib/supabase"

interface SystemHealth {
  status: "healthy" | "unhealthy" | "degraded"
  total_users: number
  new_users_24h: number
  new_documents_24h: number
  active_sessions: number
  pending_conversions: number
  processing_conversions: number
  failed_conversions_24h: number
  active_subscriptions: number
}

async function fetchAdminStats(): Promise<SystemHealth> {
  const supabase = await getPooledRouteClient()

  const [usersResult, docsResult, conversionsResult, subsResult] = await Promise.all([
    supabase.from("profiles").select("id, created_at", { count: "exact", head: true }),
    supabase.from("documents").select("id, created_at", { count: "exact", head: true }),
    supabase.from("conversion_jobs").select("id, status, created_at", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id, status", { count: "exact", head: true }),
  ])

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [newUsersResult, newDocsResult, failedConvsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    supabase.from("documents").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    supabase.from("conversion_jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", dayAgo),
  ])

  return {
    status: "healthy",
    total_users: usersResult.count ?? 0,
    new_users_24h: newUsersResult.count ?? 0,
    new_documents_24h: newDocsResult.count ?? 0,
    active_sessions: 0,
    pending_conversions: 0,
    processing_conversions: 0,
    failed_conversions_24h: failedConvsResult.count ?? 0,
    active_subscriptions: subsResult.count ?? 0,
  }
}

export default async function AdminDashboardPage() {
  const stats = await fetchAdminStats()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Users", value: stats.total_users, icon: Users, color: "bg-primary/10 text-primary", change: `+${stats.new_users_24h} (24h)` },
          { label: "Active Subscriptions", value: stats.active_subscriptions, icon: CreditCard, color: "bg-primary/10 text-primary", change: "+8%" },
          { label: "Total Documents", value: stats.new_documents_24h, icon: FileText, color: "bg-primary/10 text-primary", change: `+${stats.new_users_24h} (24h)` },
          { label: "Pending Conversions", value: stats.pending_conversions, icon: Clock, color: "bg-warning/10 text-warning", change: "-5%" },
          { label: "Failed (24h)", value: stats.failed_conversions_24h, icon: AlertTriangle, color: "bg-destructive/10 text-destructive", change: `+${stats.failed_conversions_24h}` },
          { label: "System Health", value: 0, icon: TrendingUp, color: "bg-success/10 text-success", change: stats.status },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Recent Users</CardTitle>
              <Link href="/admin/users" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground text-center py-4">No recent users</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Recent Subscriptions</CardTitle>
              <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-muted-foreground text-center py-4">No recent subscriptions</p>
            </div>
          </CardContent>
        </Card>

        {/* System Health Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <HealthMetric label="Total Users" value={stats.total_users} />
              <HealthMetric label="New Users (24h)" value={stats.new_users_24h} />
              <HealthMetric label="New Documents (24h)" value={stats.new_documents_24h} />
              <HealthMetric label="Active Sessions" value={stats.active_sessions} />
              <HealthMetric label="Pending Conversions" value={stats.pending_conversions} />
              <HealthMetric label="Processing Conversions" value={stats.processing_conversions} />
              <HealthMetric label="Failed (24h)" value={stats.failed_conversions_24h} color="destructive" />
              <HealthMetric label="Active Subscriptions" value={stats.active_subscriptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HealthMetric({ label, value, color = "default" }: { label: string; value: number; color?: string }) {
  const colors = {
    default: "bg-muted text-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }
  return (
    <div className={`p-4 rounded-lg ${colors[color as keyof typeof colors] || colors.default}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  )
}
