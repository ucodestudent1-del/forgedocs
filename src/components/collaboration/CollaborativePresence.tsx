"use client"

import { createClient } from "@supabase/supabase-js"
import { useEffect, useState, useRef, useCallback } from "react"
import { UserCircle } from "lucide-react"

interface CollaborativePresenceProps {
  documentId: string
  userName: string
  userAvatarUrl?: string | null
}

interface PresenceUser {
  user_id: string
  user_name: string | null
  user_avatar_url: string | null
  cursor_position: any
  last_seen_at: string
}

export function CollaborativePresence({
  documentId,
  userName,
  userAvatarUrl,
}: CollaborativePresenceProps) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const channelRef = useRef<any>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/collaboration/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          user_name: userName,
          user_avatar_url: userAvatarUrl,
          cursor_position: { x: 0, y: 0 },
          selection: {},
        }),
      })
    } catch {
      // heartbeat failures are non-fatal
    }
  }, [documentId, userName, userAvatarUrl])

  useEffect(() => {
    if (!documentId) return

    const channel = supabase.channel(`document:${documentId}`)

    // Track this user's presence
    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await (channel.presence as any).track({
            user_id: userName,
            user_name: userName,
            user_avatar_url: userAvatarUrl ?? null,
            cursor_position: { x: 0, y: 0 },
            selection: {},
          })
        }
      })

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const presenceList = (Object.values(state) as any[][]).flat()
        setUsers(presenceList as unknown as PresenceUser[])
      })

    channelRef.current = channel

    sendHeartbeat()
    heartbeatRef.current = setInterval(sendHeartbeat, 15000)

    fetch(`/api/collaboration/presence?document_id=${documentId}`)
      .then((res) => res.json())
      .then((data) => setUsers(data.presence ?? []))
      .catch(() => {})

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      supabase.removeChannel(channel)
    }
  }, [documentId, sendHeartbeat, supabase])

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-input/50">
      <div className="flex items-center gap-1">
        <UserCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {users.length} viewer{users.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex gap-1">
        {users.map((u) => (
          <div
            key={u.user_id}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs border border-primary/20"
            title={u.user_name ?? "Unknown user"}
          >
            <div className="h-2 w-2 rounded-full bg-green-500 border border-white border-1" />
            <span>{u.user_name ?? "Anonymous"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
