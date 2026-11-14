"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  File,
  FileSpreadsheet,
  Clock,
  Plus,
  RefreshCw,
  Bot,
  FileImage,
  FileSignature,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  ExternalLink,
  Download,
  Edit,
  Trash2,
  Star,
  Eye,
  Share2,
  Bell,
  Pen,
  Archive,
  Zap,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"
import { useToast } from "@/components/ui/use-toast"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

const DOC_TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: File,
  docx: File,
  xlsx: FileSpreadsheet,
  pptx: File,
  txt: FileText,
}

interface Document {
  id: string
  title: string
  description: string | null
  mime_type: string
  file_size: number
  updated_at: string
  version: number
  is_pinned: boolean
  is_archived: boolean
}

interface UsageStats {
  documents: { current: number; limit: number }
  conversions: { current: number; limit: number }
  storage: { current: number; limit: number } // in bytes
}

interface QuickAction {
  label: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  badge?: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [usageLoading, setUsageLoading] = useState(true)
  const { toast } = useToast()

  const quickActions: QuickAction[] = [
    {
      label: "Create Document",
      description: "Start a new document from scratch",
      icon: Pen,
      href: "/document-generator",
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Convert File",
      description: "Transform documents between formats",
      icon: RefreshCw,
      href: "/conversion",
      color: "bg-blue/10 text-blue",
    },
    {
      label: "Merge PDFs",
      description: "Combine multiple PDFs into one",
      icon: FileImage,
      href: "/pdf-tools?tool=merge",
      color: "bg-purple/10 text-purple",
    },
    {
      label: "AI Generate",
      description: "Create content with AI assistance",
      icon: Bot,
      href: "/ai-assistant",
      color: "bg-green/10 text-green",
      badge: "New",
    },
    {
      label: "E-Sign Document",
      description: "Add signatures to documents",
      icon: FileSignature,
      href: "/e-signatures",
      color: "bg-orange/10 text-orange",
    },
    {
      label: "Upload Files",
      description: "Add files to your workspace",
      icon: FolderOpen,
      href: "/files",
      color: "bg-indigo/10 text-indigo",
    },
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      await Promise.all([fetchDocuments(), fetchRecentActivity(), fetchUsageStats()])
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load dashboard data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/documents?limit=10&pinned=true")
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error("Failed to fetch documents:", e)
    }
  }

  async function fetchRecentActivity() {
    try {
      const res = await fetch("/api/activity?limit=10")
      const data = await res.json()
      setRecentActivity(data.activity || [])
    } catch (e) {
      console.error("Failed to fetch activity:", e)
    } finally {
      setActivityLoading(false)
    }
  }

  async function fetchUsageStats() {
    try {
      const res = await fetch("/api/usage")
      const data = await res.json()
      setUsageStats(data.usage || null)
    } catch (e) {
      console.error("Failed to fetch usage:", e)
    } finally {
      setUsageLoading(false)
    }
  }

  const getActivityIcon = (action: string) => {
    const icons: Record<string, React.ElementType> = {
      created: Plus,
      updated: Edit,
      deleted: Trash2,
      converted: RefreshCw,
      shared: Share2,
      downloaded: Download,
      viewed: Eye,
      signed: FileSignature,
      pinned: Star,
      archived: Archive,
    }
    return icons[action] || MoreHorizontal
  }

  const getActivityColor = (action: string) => {
    const colors: Record<string, string> = {
      created: "text-green-600 bg-green-100",
      updated: "text-blue-600 bg-blue-100",
      deleted: "text-red-600 bg-red-100",
      converted: "text-purple-600 bg-purple-100",
      shared: "text-indigo-600 bg-indigo-100",
      downloaded: "text-orange-600 bg-orange-100",
      viewed: "text-gray-600 bg-gray-100",
      signed: "text-pink-600 bg-pink-100",
      pinned: "text-yellow-600 bg-yellow-100",
      archived: "text-gray-600 bg-gray-100",
    }
    return colors[action] || "text-gray-600 bg-gray-100"
  }

  const renderUsageBar = (current: number, limit: number, label: string, unit: string = "") => {
    if (limit < 0) {
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-green-600">Unlimited</span>
          </div>
          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      )
    }

    const percentage = Math.min(100, Math.round((current / limit) * 100))
    const isWarning = percentage > 80
    const isDanger = percentage >= 100

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-medium ${isDanger ? "text-red-600" : isWarning ? "text-yellow-600" : "text-foreground"}`}>
            {current.toLocaleString()}{unit} / {limit.toLocaleString()}{unit}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isDanger ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{percentage}% used</span>
          <span>{(limit - current).toLocaleString()}{unit} remaining</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <DashboardHeader
          title="Dashboard"
          description="Manage your documents and templates"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Loading...</CardTitle>
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted w-1/2 rounded" />
                <div className="h-4 bg-muted w-1/3 rounded mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      <ScrollIndicator position="top" className="opacity-50" />
      <DashboardHeader
        title="Dashboard"
        description="Overview of your workspace activity and usage"
        action={
          <Button className="flex items-center gap-2" onClick={() => window.location.href = "/document-generator"}>
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={documents.filter((d) => !d.is_archived).length}
          icon={FileText}
          change="+12%"
          trend="up"
        />
        <StatCard
          title="Pinned Documents"
          value={documents.filter((d) => d.is_pinned).length}
          icon={Star}
          change="0%"
          trend="neutral"
        />
        <StatCard
          title="Storage Used"
          value={usageStats ? formatFileSize(usageStats.storage.current) : "0 B"}
          icon={FileSpreadsheet}
          change={usageStats && usageStats.storage.limit > 0
            ? `${Math.round((usageStats.storage.current / usageStats.storage.limit) * 100)}%`
            : "Unlimited"}
          trend={usageStats && usageStats.storage.limit > 0 && usageStats.storage.current / usageStats.storage.limit > 0.8 ? "down" : "neutral"}
        />
        <StatCard
          title="Conversions This Month"
          value={usageStats?.conversions.current || 0}
          icon={RefreshCw}
          change={usageStats && usageStats.conversions.limit > 0
            ? `${Math.round((usageStats.conversions.current / usageStats.conversions.limit) * 100)}% of limit`
            : "Unlimited"}
          trend={usageStats && usageStats.conversions.limit > 0 && usageStats.conversions.current / usageStats.conversions.limit > 0.8 ? "down" : "neutral"}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions + Recent Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <QuickActionCard key={action.label} action={action} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Your most recently updated documents</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <h3 className="font-medium">No documents yet</h3>
                  <p className="text-sm">Create your first document to get started.</p>
                  <Button className="mt-4" onClick={() => window.location.href = "/document-generator"}>
                    Create Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Usage + Activity */}
        <div className="space-y-6">
          {/* Usage & Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage & Limits
              </CardTitle>
              <CardDescription>Current period usage against your plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : usageStats ? (
                <div className="space-y-6">
                  {renderUsageBar(
                    usageStats.documents.current,
                    usageStats.documents.limit,
                    "Documents",
                    ""
                  )}
                  {renderUsageBar(
                    usageStats.conversions.current,
                    usageStats.conversions.limit,
                    "Conversions",
                    ""
                  )}
                  {renderUsageBar(
                    usageStats.storage.current,
                    usageStats.storage.limit,
                    "Storage",
                    "B"
                  )}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/usage">
                      View Detailed Usage
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Unable to load usage data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions across your workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/activity">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity: any, index: number) => (
                    <ActivityRow
                      key={`${activity.id}-${index}`}
                      activity={activity}
                      getIcon={getActivityIcon}
                      getColor={getActivityColor}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  trend = "neutral",
}: {
  title: string
  value: string | number
  icon: React.ElementType
  change: string
  trend?: "up" | "down" | "neutral"
}) {
  const trendIcons = {
    up: <TrendingUp className="h-3 w-3 text-green-600" />,
    down: <TrendingDown className="h-3 w-3 text-red-600" />,
    neutral: <span className="h-3 w-3" />,
  }

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]}
            {change} from last month
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon
  return (
    <Link
      href={action.href}
      className="group flex flex-col p-4 rounded-lg border border-input bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
    >
      <div className={`flex items-center justify-center h-10 w-10 rounded-lg mb-3 ${action.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{action.label}</h3>
        {action.badge && (
          <Badge variant="secondary" className="text-xs ml-2">
            {action.badge}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>
    </Link>
  )
}

function DocumentRow({ doc }: { doc: Document }) {
  const Icon = DOC_TYPE_ICONS[doc.mime_type?.split("/").pop() || "txt"] || FileText

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{doc.title}</span>
          {doc.is_pinned && <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
          {doc.is_archived && <Archive className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          Updated {new Date(doc.updated_at).toLocaleDateString()} · {formatFileSize(doc.file_size)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/reader/${doc.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/editor?id=${doc.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href={`/api/documents/${doc.id}/export`}>
            <Download className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ActivityRow({
  activity,
  getIcon,
  getColor,
}: {
  activity: any
  getIcon: (action: string) => React.ElementType
  getColor: (action: string) => string
}) {
  const Icon = getIcon(activity.action)
  const colorClass = getColor(activity.action)

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.entity_type}: {activity.metadata?.title || activity.entity_id}</p>
        <p className="text-xs text-muted-foreground">
          {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} ·
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(activity.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  )
}

// Import Link for use in components
import Link from "next/link"