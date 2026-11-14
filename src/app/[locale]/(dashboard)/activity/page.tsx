"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  FileText,
  Upload,
  Share2,
  Eye,
  Star,
  Archive,
  User,
  Bot,
  FileSignature,
  FileImage,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface ActivityItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, any>
  ip_address: string | null
  created_at: string
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  updated: Edit,
  deleted: Trash2,
  uploaded: Upload,
  downloaded: Download,
  viewed: Eye,
  shared: Share2,
  converted: RefreshCw,
  signed: FileSignature,
  pinned: Star,
  archived: Archive,
  generated: Bot,
  ocr: FileImage,
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
  uploaded: "bg-purple-100 text-purple-700",
  downloaded: "bg-orange-100 text-orange-700",
  viewed: "bg-gray-100 text-gray-700",
  shared: "bg-indigo-100 text-indigo-700",
  converted: "bg-purple-100 text-purple-700",
  signed: "bg-pink-100 text-pink-700",
  pinned: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-700",
  generated: "bg-green-100 text-green-700",
  ocr: "bg-blue-100 text-blue-700",
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  document: FileText,
  template: FileText,
  conversion_job: RefreshCw,
  signature_request: FileSignature,
  share: Share2,
  folder: FileText,
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("week")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    fetchActivities()
  }, [dateRange])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "100",
        ...(filterAction !== "all" && { action: filterAction }),
        ...(filterEntity !== "all" && { entity_type: filterEntity }),
      })
      const res = await fetch(`/api/activity?${params}`)
      const data = await res.json()
      setActivities(data.activity || [])
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load activity", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = JSON.stringify(activity.metadata).toLowerCase().includes(search.toLowerCase()) ||
      activity.entity_id.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortOrder === "desc" ? diff : -diff
  })

  const getActionLabel = (action: string) => {
    return action.charAt(0).toUpperCase() + action.slice(1)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const exportActivities = () => {
    const csv = [
      ["Date", "Action", "Entity Type", "Entity ID", "Details", "IP Address"],
      ...sortedActivities.map((a) => [
        formatDate(a.created_at),
        getActionLabel(a.action),
        a.entity_type,
        a.entity_id,
        JSON.stringify(a.metadata),
        a.ip_address || "N/A",
      ]),
    ].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Activity exported", variant: "success" })
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Activity History"
        description="Audit log of all actions across your workspace"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportActivities}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="downloaded">Downloaded</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="generated">AI Generated</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="conversion_job">Conversion</SelectItem>
                <SelectItem value="signature_request">E-Signature</SelectItem>
                <SelectItem value="share">Share</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            >
              {sortOrder === "desc" ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Newest First
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Oldest First
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 animate-pulse">
              <div className="space-y-4 mx-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="h-14 bg-muted rounded" />
                ))}
              </div>
            </div>
          ) : sortedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No activity found</h3>
              <p className="text-sm">
                {search ? "Try adjusting your search or filters" : "No activity recorded yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 w-10">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 w-48">Date & Time</th>
                    <th className="px-4 py-3 w-32">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedActivities.map((activity) => {
                    const Icon = ACTION_ICONS[activity.action] || MoreHorizontal
                    const colorClass = ACTION_COLORS[activity.action] || "bg-gray-100 text-gray-700"
                    const EntityIcon = ENTITY_ICONS[activity.entity_type] || FileText

                    return (
                      <tr key={activity.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-2 h-8 w-8 rounded-lg ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EntityIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium capitalize">{activity.entity_type.replace("_", " ")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{getActionLabel(activity.action)}</p>
                            <p className="text-xs text-muted-foreground font-mono">{activity.entity_id}</p>
                            {activity.metadata?.title && (
                              <p className="text-xs text-muted-foreground truncate max-w-[400px]">
                                {activity.metadata.title}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(activity.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {activity.ip_address || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"