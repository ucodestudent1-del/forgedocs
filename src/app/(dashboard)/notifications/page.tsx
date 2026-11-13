"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  Bell,
  Check,
  CheckCircle,
  X,
  Filter,
  RefreshCw,
  Clock,
  FileText,
  RefreshCw as RefreshIcon,
  Bot,
  FileSignature,
  Share2,
  Download,
  Eye,
  Mail,
  MoreHorizontal,
  Loader2,
} from "lucide-react"

interface Notification {
  id: string
  type: "conversion_complete" | "ai_generated" | "signature_request" | "signature_completed" | "shared_with_me" | "document_shared" | "usage_warning" | "system"
  title: string
  message: string
  read: boolean
  action_url?: string
  action_label?: string
  created_at: string
  metadata?: Record<string, any>
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  conversion_complete: RefreshIcon,
  ai_generated: Bot,
  signature_request: FileSignature,
  signature_completed: CheckCircle,
  shared_with_me: Share2,
  document_shared: Share2,
  usage_warning: AlertTriangle,
  system: Bell,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  conversion_complete: "bg-purple-100 text-purple-700",
  ai_generated: "bg-green-100 text-green-700",
  signature_request: "bg-pink-100 text-pink-700",
  signature_completed: "bg-green-100 text-green-700",
  shared_with_me: "bg-indigo-100 text-indigo-700",
  document_shared: "bg-blue-100 text-blue-700",
  usage_warning: "bg-yellow-100 text-yellow-700",
  system: "bg-gray-100 text-gray-700",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      // Mock data for demo
      const mockData: Notification[] = [
        {
          id: "1",
          type: "conversion_complete",
          title: "Conversion Complete",
          message: "Your PDF to DOCX conversion is ready",
          read: false,
          action_url: "/conversion",
          action_label: "View Result",
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          type: "ai_generated",
          title: "AI Document Generated",
          message: "Business Proposal template has been generated",
          read: false,
          action_url: "/editor?id=doc-123",
          action_label: "Open Document",
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          type: "signature_request",
          title: "Signature Request Received",
          message: "John Doe requested your signature on NDA.pdf",
          read: true,
          action_url: "/e-signatures",
          action_label: "Sign Document",
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "4",
          type: "signature_completed",
          title: "Document Signed",
          message: "Service Agreement.pdf has been signed by all parties",
          read: true,
          action_url: "/e-signatures",
          action_label: "Download",
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "5",
          type: "shared_with_me",
          title: "Document Shared With You",
          message: "Jane Smith shared Project Proposal.pdf with you",
          read: false,
          action_url: "/reader/doc-456",
          action_label: "View Document",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "6",
          type: "usage_warning",
          title: "Storage Limit Warning",
          message: "You've used 85% of your storage limit (4.25 GB / 5 GB)",
          read: false,
          action_url: "/usage",
          action_label: "View Usage",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "7",
          type: "conversion_complete",
          title: "Batch Conversion Complete",
          message: "5 files converted from DOCX to PDF",
          read: true,
          action_url: "/conversion",
          action_label: "Download All",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
      setNotifications(mockData)
    } catch (e) {
      console.error(e)
      toast({ title: "Failed to load notifications", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read
    if (filter === "read") return n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead = async (id: string) => {
    try {
      // await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      // await fetch("/api/notifications/read-all", { method: "POST" })
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      toast({ title: "All marked as read", variant: "success" })
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const handleAction = (notification: Notification) => {
    if (notification.action_url) {
      handleMarkRead(notification.id)
      window.location.href = notification.action_url
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Notifications"
        description="Stay updated on your document activity"
        action={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex border-b border-input">
        {[
          { key: "all" as const, label: "All", count: notifications.length },
          { key: "unread" as const, label: "Unread", count: unreadCount },
          { key: "read" as const, label: "Read", count: notifications.length - unreadCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 animate-pulse">
              <div className="space-y-4 mx-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-muted rounded" />
                ))}
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No notifications</h3>
              <p className="text-sm">
                {filter === "unread" ? "You're all caught up!" : "No notifications yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type]
                const colorClass = NOTIFICATION_COLORS[notification.type]

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-accent/50 transition-colors flex items-start gap-4 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkRead(notification.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-accent text-muted-foreground"
                            aria-label="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">{formatTime(notification.created_at)}</span>
                        {notification.action_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(notification)}
                          >
                            {notification.action_label || "View"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"