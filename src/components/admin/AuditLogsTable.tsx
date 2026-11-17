"use client"

import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Badge } from "@/components/ui/badge"
import { FileText, User, Database, Shield, AlertCircle, Search } from "lucide-react"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"

interface AuditLogRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export function AuditLogsTable() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityFilter, setEntityFilter] = useState("all")

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = logs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(search.toLowerCase())
    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter
    return matchesSearch && matchesAction && matchesEntity
  })

  function getActionBadge(action: string) {
    if (action.includes("created")) return <Badge variant="default">{action}</Badge>
    if (action.includes("updated")) return <Badge variant="outline">{action}</Badge>
    if (action.includes("deleted")) return <Badge variant="destructive">{action}</Badge>
    if (action.includes("mfa")) return <Badge variant="secondary">{action}</Badge>
    if (action.includes("login")) return <Badge variant="outline">{action}</Badge>
    return <Badge variant="outline">{action}</Badge>
  }

  function getActionIcon(action: string) {
    if (action.includes("created")) return <FileText className="h-4 w-4 text-success" />
    if (action.includes("updated")) return <Database className="h-4 w-4 text-primary" />
    if (action.includes("deleted")) return <AlertCircle className="h-4 w-4 text-destructive" />
    if (action.includes("mfa")) return <Shield className="h-4 w-4 text-primary" />
    if (action.includes("login")) return <User className="h-4 w-4 text-muted-foreground" />
    return <FileText className="h-4 w-4 text-muted-foreground" />
  }

  if (loading) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Loading audit logs...</p></div>
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-4"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Actions</option>
          <option value="user.created">User Created</option>
          <option value="user.updated">User Updated</option>
          <option value="document.created">Document Created</option>
          <option value="document.updated">Document Updated</option>
          <option value="document.deleted">Document Deleted</option>
          <option value="subscription.created">Subscription Created</option>
          <option value="subscription.updated">Subscription Updated</option>
          <option value="mfa.enabled">MFA Enabled</option>
          <option value="mfa.disabled">MFA Disabled</option>
          <option value="login">Login</option>
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All Entities</option>
          <option value="user">User</option>
          <option value="document">Document</option>
          <option value="subscription">Subscription</option>
          <option value="template">Template</option>
          <option value="conversion_job">Conversion Job</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No audit logs found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-3 px-4 border rounded-lg bg-card">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {getActionIcon(log.action)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{getActionBadge(log.action)}</p>
                  <p className="text-xs text-muted-foreground truncate">{log.entity_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{log.entity_id?.slice(0, 12) + "..." || "N/A"}</span>
                <span className="font-mono text-xs text-muted-foreground">{log.ip_address || "N/A"}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}</span>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">View metadata</summary>
                  <pre className="mt-1 p-2 bg-muted rounded overflow-auto max-h-24">{JSON.stringify(log.metadata, null, 2)}</pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}