import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, FileText, AlertTriangle, TrendingUp, Clock, Download, Search, Shield, Mail, MoreHorizontal, UserPlus } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

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

export default function AdminDashboardPage() {
  // TEMPORARILY DISABLED: Auth check removed for development
  // Using mock data for demo

  const stats = [
    { label: "Total Users", value: 1247, icon: Users, color: "bg-blue-100 text-blue-600", change: "+12%" },
    { label: "Active Subscriptions", value: 89, icon: CreditCard, color: "bg-green-100 text-green-600", change: "+8%" },
    { label: "Total Documents", value: 12847, icon: FileText, color: "bg-purple-100 text-purple-600", change: "+23%" },
    { label: "Pending Conversions", value: 3, icon: Clock, color: "bg-amber-100 text-amber-600", change: "-5%" },
    { label: "Failed (24h)", value: 2, icon: AlertTriangle, color: "bg-red-100 text-red-600", change: "+2" },
    { label: "System Health", value: "Healthy", icon: TrendingUp, color: "bg-green-100 text-green-600", change: "" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
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
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
              <CardTitle className="text-lg">Recent Users</CardTitle>
              <Link href="/admin/users" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers?.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(u.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Subscriptions</CardTitle>
              <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubscriptions?.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{s.tier.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">User: {s.user_id.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={s.status === "active" ? "default" : s.status === "past_due" ? "destructive" : "secondary"}>
                      {s.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.current_period_end ? format(new Date(s.current_period_end), "MMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">No subscriptions found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <HealthMetric label="Total Users" value={systemHealth?.total_users ?? 0} />
              <HealthMetric label="New Users (24h)" value={systemHealth?.new_users_24h ?? 0} />
              <HealthMetric label="New Documents (24h)" value={systemHealth?.new_documents_24h ?? 0} />
              <HealthMetric label="Active Sessions" value={systemHealth?.active_sessions ?? 0} />
              <HealthMetric label="Pending Conversions" value={systemHealth?.pending_conversions ?? 0} />
              <HealthMetric label="Processing Conversions" value={systemHealth?.processing_conversions ?? 0} />
              <HealthMetric label="Failed (24h)" value={systemHealth?.failed_conversions_24h ?? 0} color="red" />
              <HealthMetric label="Active Subscriptions" value={systemHealth?.active_subscriptions ?? 0} />
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
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
  }
  return (
    <div className={`p-4 rounded-lg ${colors[color as keyof typeof colors] || colors.default}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}