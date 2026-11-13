import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, CreditCard, FileText, AlertTriangle, TrendingUp, Clock, Download, Search, Shield, DollarSign, Calendar, XCircle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { SubscriptionTable } from "@/components/admin/SubscriptionTable"

export default function AdminSubscriptionsPage() {
  // TEMPORARILY DISABLED: Auth check removed for development
  // Using mock data for demo
  const activeCount = 89
  const pastDueCount = 12
  const canceledCount = 5

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">View and manage all subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active" value={activeCount ?? 0} icon={CreditCard} color="green" />
        <StatCard title="Past Due" value={pastDueCount ?? 0} icon={AlertTriangle} color="amber" />
        <StatCard title="Canceled" value={canceledCount ?? 0} icon={XCircle} color="red" />
        <StatCard title="MRR" value="$0" icon={DollarSign} color="blue" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search subscriptions..."
                  className="h-10 pl-10 pr-4 w-full md:w-80"
                />
              </div>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionTable />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) {
  const colors = {
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
  }
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${colors[color as keyof typeof colors] || colors.green}`} />
      </CardContent>
    </Card>
  )
}