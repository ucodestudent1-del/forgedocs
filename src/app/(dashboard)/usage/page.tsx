"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  CreditCard,
  FileText,
  RefreshCw,
  HardDrive,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowUpRight,
  Lock,
  Settings,
  Clock,
  BarChart3,
  PieChart,
} from "lucide-react"

interface UsageData {
  documents: { current: number; limit: number }
  conversions: { current: number; limit: number }
  storage: { current: number; limit: number } // bytes
  api_requests: { current: number; limit: number }
  tier: string
  tierLimits: {
    documents_per_month: number
    conversions_per_month: number
    storage_gb: number
    max_file_size_mb: number
    api_requests_per_minute: number
    has_priority_support: boolean
    has_audit_logs: boolean
    has_advanced_templates: boolean
  }
}

const TIER_FEATURES = {
  free: {
    name: "Free",
    price: "$0",
    color: "bg-gray-100 text-gray-700",
    features: [
      "500 documents/month",
      "100 conversions/month",
      "5 GB storage",
      "10 MB max file size",
      "Community support",
      "Basic templates",
    ],
    limits: { documents: 500, conversions: 100, storage_gb: 5, file_size_mb: 10 },
  },
  pro: {
    name: "Pro",
    price: "$15/mo",
    color: "bg-blue-100 text-blue-700",
    features: [
      "Unlimited documents",
      "Unlimited conversions",
      "100 GB storage",
      "50 MB max file size",
      "Priority support",
      "Advanced templates",
      "Audit logs",
      "API access",
    ],
    limits: { documents: -1, conversions: -1, storage_gb: 100, file_size_mb: 50 },
  },
  business: {
    name: "Business",
    price: "$49/mo",
    color: "bg-purple-100 text-purple-700",
    features: [
      "Unlimited documents",
      "Unlimited conversions",
      "500 GB storage",
      "100 MB max file size",
      "Priority support",
      "Advanced templates",
      "Audit logs",
      "API access",
      "SSO/SAML",
      "Custom branding",
    ],
    limits: { documents: -1, conversions: -1, storage_gb: 500, file_size_mb: 100 },
  },
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/usage")
      const data = await res.json()
      if (data.usage) {
        setUsage(data.usage)
      }
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load usage data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getProgress = (current: number, limit: number) => {
    if (limit < 0) return 100
    return Math.min(100, Math.round((current / limit) * 100))
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500"
    if (percentage >= 80) return "bg-yellow-500"
    return "bg-primary"
  }

  const renderUsageCard = (
    title: string,
    current: number,
    limit: number,
    Icon: React.ElementType,
    format: (val: number) => string,
    color: string = "primary"
  ) => {
    const percentage = getProgress(current, limit)
    const isUnlimited = limit < 0
    const isWarning = percentage > 80 && !isUnlimited
    const isDanger = percentage >= 100

    return (
      <Card className={isDanger ? "border-red-200" : isWarning ? "border-yellow-200" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>{title}</span>
            <Badge variant={isDanger ? "destructive" : isWarning ? "default" : "secondary"} className="text-xs">
              {isUnlimited ? "Unlimited" : `${percentage}%`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}/10`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{isUnlimited ? "Unlimited" : format(current)}</p>
                <p className="text-xs text-muted-foreground">
                  {isUnlimited ? "No limit" : `of ${format(limit)}`}
                </p>
              </div>
            </div>
            {isDanger && <AlertTriangle className="h-5 w-5 text-red-500" />}
          </div>
          {!isUnlimited && (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isUnlimited ? "No limit" : `${format(limit - current)} remaining`}</span>
            <span>Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading || !usage) {
    return (
      <div className="space-y-6 animate-pulse">
        <DashboardHeader
          title="Usage & Limits"
          description="Monitor your resource usage against plan limits"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const currentTier = TIER_FEATURES[usage.tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.free
  const nextTier = usage.tier === "free" ? TIER_FEATURES.pro : usage.tier === "pro" ? TIER_FEATURES.business : null

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Usage & Limits"
        description="Monitor your resource usage against plan limits"
      />

      {/* Current Plan */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${currentTier.color}`}>
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentTier.name} Plan</h2>
                <p className="text-muted-foreground">{currentTier.price}</p>
              </div>
            </div>
            {nextTier && (
              <Button className="gap-2" asChild>
                <a href="/billing">
                  <ArrowUpRight className="h-4 w-4" />
                  Upgrade to {nextTier.name}
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {currentTier.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderUsageCard(
          "Documents",
          usage.documents.current,
          usage.documents.limit,
          FileText,
          (v) => v.toLocaleString(),
          "bg-blue-100 text-blue-600"
        )}
        {renderUsageCard(
          "Conversions",
          usage.conversions.current,
          usage.conversions.limit,
          RefreshCw,
          (v) => v.toLocaleString(),
          "bg-purple-100 text-purple-600"
        )}
        {renderUsageCard(
          "Storage",
          usage.storage.current,
          usage.storage.limit,
          HardDrive,
          formatBytes,
          "bg-green-100 text-green-600"
        )}
        {renderUsageCard(
          "API Requests/min",
          usage.api_requests.current,
          usage.api_requests.limit,
          BarChart3,
          (v) => v.toLocaleString(),
          "bg-orange-100 text-orange-600"
        )}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StorageBreakdown usage={usage} />
          </CardContent>
        </Card>

        {/* Usage History Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart />
          </CardContent>
        </Card>
      </div>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Plans</CardTitle>
          <CardDescription>See what you unlock with each tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pr-4">Feature</th>
                  <th className="pb-3 pr-4 text-center">Free</th>
                  <th className="pb-3 pr-4 text-center">Pro</th>
                  <th className="pb-3 text-center">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <PlanRow feature="Documents/month" values={["500", "Unlimited", "Unlimited"]} highlight={usage.tier} />
                <PlanRow feature="Conversions/month" values={["100", "Unlimited", "Unlimited"]} highlight={usage.tier} />
                <PlanRow feature="Storage" values={["5 GB", "100 GB", "500 GB"]} highlight={usage.tier} />
                <PlanRow feature="Max file size" values={["10 MB", "50 MB", "100 MB"]} highlight={usage.tier} />
                <PlanRow feature="API requests/min" values={["30", "100", "500"]} highlight={usage.tier} />
                <PlanRow feature="Priority support" values={["No", "Yes", "Yes"]} highlight={usage.tier} />
                <PlanRow feature="Audit logs" values={["No", "Yes", "Yes"]} highlight={usage.tier} />
                <PlanRow feature="Advanced templates" values={["No", "Yes", "Yes"]} highlight={usage.tier} />
                <PlanRow feature="SSO/SAML" values={["No", "No", "Yes"]} highlight={usage.tier} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StorageBreakdown({ usage }: { usage: UsageData }) {
  // Mock breakdown
  const breakdown = [
    { label: "Documents", value: usage.storage.current * 0.6, color: "bg-blue-500" },
    { label: "Conversions", value: usage.storage.current * 0.25, color: "bg-purple-500" },
    { label: "Templates", value: usage.storage.current * 0.1, color: "bg-green-500" },
    { label: "Other", value: usage.storage.current * 0.05, color: "bg-gray-500" },
  ]

  const total = usage.storage.current
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  return (
    <div className="space-y-3">
      {breakdown.map((item) => {
        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="font-medium">{formatBytes(item.value)} ({percentage}%)</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${percentage}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        )
      })}
      <div className="pt-2 border-t flex justify-between text-sm">
        <span>Total</span>
        <span className="font-medium">{formatBytes(total)} / {formatBytes(usage.storage.limit)}</span>
      </div>
    </div>
  )
}

function UsageChart() {
  // Simple mock chart using bars
  const data = [
    { label: "Week 1", documents: 45, conversions: 12, storage: 1.2 },
    { label: "Week 2", documents: 67, conversions: 23, storage: 1.8 },
    { label: "Week 3", documents: 34, conversions: 8, storage: 0.9 },
    { label: "Week 4", documents: 89, conversions: 31, storage: 2.1 },
  ]

  const maxVal = Math.max(...data.flatMap((d) => [d.documents, d.conversions * 2, d.storage * 20]))

  return (
    <div className="h-64 flex items-end justify-around p-4">
      {data.map((week, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-32">
          <div className="flex gap-1 h-[200px] items-end w-full justify-around">
            <div
              className="bg-blue-500 rounded-t w-6 transition-all hover:opacity-80"
              style={{ height: `${(week.documents / maxVal) * 100}%` }}
              title={`${week.documents} documents`}
            />
            <div
              className="bg-purple-500 rounded-t w-6 transition-all hover:opacity-80"
              style={{ height: `${(week.conversions * 2 / maxVal) * 100}%` }}
              title={`${week.conversions} conversions`}
            />
            <div
              className="bg-green-500 rounded-t w-6 transition-all hover:opacity-80"
              style={{ height: `${(week.storage * 20 / maxVal) * 100}%` }}
              title={`${week.storage.toFixed(1)} GB storage`}
            />
          </div>
          <span className="text-xs text-muted-foreground">{week.label}</span>
        </div>
      ))}
      <div className="flex flex-col items-start gap-4 ml-4">
        <Legend color="bg-blue-500" label="Documents" />
        <Legend color="bg-purple-500" label="Conversions" />
        <Legend color="bg-green-500" label="Storage (GB)" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={`h-3 w-6 rounded ${color}`} />
      <span>{label}</span>
    </div>
  )
}

function PlanRow({ feature, values, highlight }: { feature: string; values: string[]; highlight: string }) {
  const tiers = ["free", "pro", "business"]
  return (
    <tr className="hover:bg-accent/50">
      <td className="py-3 pr-4 text-sm font-medium">{feature}</td>
      {values.map((value, i) => (
        <td key={i} className="py-3 pr-4 text-center text-sm">
          {tiers[i] === highlight ? (
            <Badge variant="secondary" className="text-xs">{value}</Badge>
          ) : (
            <span className={tiers[i] === "free" && i > 0 ? "text-muted-foreground" : ""}>{value}</span>
          )}
        </td>
      ))}
    </tr>
  )
}