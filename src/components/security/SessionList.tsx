"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Smartphone, Monitor, Tablet, Globe, Loader2 } from "lucide-react"

interface Session {
  id: string
  user_agent: string
  ip_address: string
  created_at: string
}

interface SessionListProps {
  userId: string
}

export function SessionList({ userId }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [userId])

  async function fetchSessions() {
    try {
      const res = await fetch("/api/auth/sessions")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
      if (res.ok) {
        fetchSessions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function revokeAllSessions() {
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke_all: true }),
      })
      if (res.ok) {
        fetchSessions()
      }
    } catch (e) {
      console.error(e)
    }
  }

  function getDeviceIcon(userAgent?: string): React.ReactNode {
    if (!userAgent) return <Monitor className="h-5 w-5 text-muted-foreground" />
    const ua = userAgent.toLowerCase()
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-5 w-5 text-muted-foreground" />
    }
    if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="h-5 w-5 text-muted-foreground" />
    }
    return <Monitor className="h-5 w-5 text-muted-foreground" />
  }

  function getDeviceName(userAgent?: string): string {
    if (!userAgent) return "Unknown Device"
    const ua = userAgent.toLowerCase()
    if (ua.includes("chrome")) return "Chrome"
    if (ua.includes("firefox")) return "Firefox"
    if (ua.includes("safari")) return "Safari"
    if (ua.includes("edge")) return "Edge"
    return "Unknown Browser"
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
  <Globe className="h-5 w-5 text-primary" />
</div>
            <div>
              <CardTitle className="text-lg">Active Sessions</CardTitle>
              <CardDescription>Manage devices signed into your account</CardDescription>
            </div>
          </div>
          <Badge variant="outline">{sessions.length} active</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session: Session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {getDeviceIcon(session.user_agent)}
                  </div>
                  <div>
                    <p className="font-medium">{getDeviceName(session.user_agent)}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.ip_address} • {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeSession(session.id)}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Revoke
                </Button>
              </div>
            ))}
            <div className="pt-4 border-t">
              <Button variant="outline" onClick={revokeAllSessions}>
                <LogOut className="h-4 w-4 mr-2" />
                Revoke All Other Sessions
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active sessions found</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}