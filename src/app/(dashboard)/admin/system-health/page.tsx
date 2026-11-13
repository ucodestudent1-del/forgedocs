"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2, Database, Server, HardDrive, Wifi, Activity, TrendingUp, RefreshCw, FileText, Users, CreditCard } from "lucide-react"
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
  database?: { status: string; latency?: number; error?: string }
  redis?: { status: string; latency?: number; error?: string }
  stripe?: { status: string; latency?: number; error?: string }
}

export default function AdminSystemHealthPage() {
  // TEMPORARILY DISABLED: Auth check removed for development
  // Using mock data for demo
  const health: SystemHealth = {
    status: "healthy",
    total_users: 1247,
    new_users_24h: 12,
    new_documents_24h: 89,
    active_sessions: 47,
    pending_conversions: 3,
    processing_conversions: 1,
    failed_conversions_24h: 2,
    active_subscriptions: 89,
    database: { status: "healthy", latency: 12 },
    redis: { status: "healthy", latency: 3 },
    stripe: { status: "healthy", latency: 45 },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and performance</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={health?.status === "healthy" ? "border-green-500" : "border-amber-500"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${health?.status === "healthy" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                {health?.status === "healthy" ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">System Status</CardTitle>
                <CardDescription>
                  {health?.status === "healthy" ? "All systems operational" : "Some systems degraded"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={health?.status === "healthy" ? "default" : "secondary"} className="text-lg px-4 py-2">
              {health?.status === "healthy" ? "HEALTHY" : "DEGRADED"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Health Checks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HealthCheckCard
          title="Database"
          icon={Database}
          status={health?.database?.status || "unknown"}
          latency={health?.database?.latency}
          error={health?.database?.error}
        />
        <HealthCheckCard
          title="Redis Cache"
          icon={Server}
          status={health?.redis?.status || "unknown"}
          latency={health?.redis?.latency}
          error={health?.redis?.error}
        />
        <HealthCheckCard
          title="Stripe"
          icon={Wifi}
          status={health?.stripe?.status || "unknown"}
          latency={health?.stripe?.latency}
          error={health?.stripe?.error}
        />
        <HealthCheckCard
          title="Storage"
          icon={HardDrive}
          status="healthy"
          description="Supabase Storage operational"
        />
      </div>

      {/* System Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow label="Total Users" value={health?.total_users ?? 0} />
            <MetricRow label="New Users (24h)" value={health?.new_users_24h ?? 0} />
            <MetricRow label="Total Documents" value={0} />
            <MetricRow label="New Documents (24h)" value={health?.new_documents_24h ?? 0} />
            <MetricRow label="Active Subscriptions" value={health?.active_subscriptions ?? 0} />
            <MetricRow label="Active Sessions" value={health?.active_sessions ?? 0} />
            <MetricRow label="Pending Conversions" value={health?.pending_conversions ?? 0} />
            <MetricRow label="Processing Conversions" value={health?.processing_conversions ?? 0} />
            <MetricRow label="Failed Conversions (24h)" value={health?.failed_conversions_24h ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "/admin/audit-logs"}>
              <FileText className="h-4 w-4" />
              View Audit Logs
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "/admin/users"}>
              <Users className="h-4 w-4" />
              Manage Users
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "/admin/subscriptions"}>
              <CreditCard className="h-4 w-4" />
              Manage Subscriptions
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" onClick={() => window.location.href = "/api/health"}>
              <Activity className="h-4 w-4" />
              API Health Check
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HealthCheckCard({ title, icon: Icon, status, latency, error, description }: {
  title: string
  icon: React.ElementType
  status: string
  latency?: number
  error?: string
  description?: string
}) {
  const isHealthy = status === "healthy"
  return (
    <Card className={isHealthy ? "border-green-200" : status === "unhealthy" ? "border-red-200" : "border-amber-200"}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isHealthy ? "bg-green-100 text-green-600" : status === "unhealthy" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description || (isHealthy ? "Operational" : "Degraded")}</p>
            </div>
          </div>
          <Badge variant={isHealthy ? "default" : status === "unhealthy" ? "destructive" : "secondary"}>
            {status.toUpperCase()}
          </Badge>
        </div>
        {latency && (
          <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
            <span>Latency</span>
            <span className="font-mono">{latency}ms</span>
          </div>
        )}
        {error && (
          <div className="mt-4 pt-4 border-t text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold">{value.toLocaleString()}</span>
    </div>
  )
}