import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, FileText, AlertTriangle, TrendingUp, Clock, Download, Search, Shield, Mail, MoreHorizontal, UserPlus } from "lucide-react"
import Link from "next/link"

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
    { label: "Total Users", value: 1247, icon: Users, color: "bg-primary/10 text-primary", change: "+12%" },
    { label: "Active Subscriptions", value: 89, icon: CreditCard, color: "bg-primary/10 text-primary", change: "+8%" },
    { label: "Total Documents", value: 12847, icon: FileText, color: "bg-primary/10 text-primary", change: "+23%" },
    { label: "Pending Conversions", value: 3, icon: Clock, color: "bg-warning/10 text-warning", change: "-5%" },
    { label: "Failed (24h)", value: 2, icon: AlertTriangle, color: "bg-destructive/10 text-destructive", change: "+2" },
    { label: "System Health", value: "Healthy", icon: TrendingUp, color: "bg-success/10 text-success", change: "" },
  ]

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
        {stats.map((stat) => (
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
              <p className="text-muted-foreground text-center py-4">Demo data - no real users</p>
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
              <p className="text-muted-foreground text-center py-4">Demo data - no real subscriptions</p>
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
              <HealthMetric label="Total Users" value={1247} />
              <HealthMetric label="New Users (24h)" value={12} />
              <HealthMetric label="New Documents (24h)" value={89} />
              <HealthMetric label="Active Sessions" value={47} />
              <HealthMetric label="Pending Conversions" value={3} />
              <HealthMetric label="Processing Conversions" value={1} />
              <HealthMetric label="Failed (24h)" value={2} color="destructive" />
              <HealthMetric label="Active Subscriptions" value={89} />
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
