"use client"

import { createClient } from "@supabase/supabase-js"
import { useEffect, useState, useRef, useCallback } from "react"
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface RealtimeOptions {
  filter?: string
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void
}

/**
 * Hook for subscribing to real-time database changes via Supabase Realtime
 */
export function useRealtime<T = any>(
  table: string,
  filter?: string,
  options: RealtimeOptions = {}
) {
  const { onInsert, onUpdate, onDelete } = options
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { ack: true }, presence: { key: '' } }
    })

    if (onInsert) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, onInsert)
    }
    if (onUpdate) {
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, onUpdate)
    }
    if (onDelete) {
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table, filter }, onDelete)
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Realtime subscribed to ${table}`)
      }
    })

    setChannel(channel)
    return () => {
      // Sync cleanup - supabase.removeChannel returns void
      supabase.removeChannel(channel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete])

  return channel
}

/**
 * Hook for presence tracking (who is online/viewing a document)
 */
export function usePresence(
  channelName: string,
  user: { id: string; email?: string; avatar_url?: string }
) {
  const [users, setUsers] = useState<any[]>([])
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const allUsers = Object.values(state).flat() as any[]
        setUsers(allUsers.filter((u: any) => u.id !== user.id))
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        setUsers((prev) => [...prev, ...newPresences])
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        setUsers((prev) => prev.filter((u: any) => !leftPresences.some((lp: any) => lp.id === u.id)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            name: user.email,
            avatar: user.avatar_url,
            cursor: { x: 0, y: 0 },
            selection: null
          })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelName, user])

  return users
}

/**
 * Hook for broadcasting cursor position to collaborators
 */
export function useCursorBroadcast(channelName: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const channel = supabase.channel(channelName)

  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    channel.send({ type: 'broadcast', event: 'cursor', payload: position })
  }, [channel])

  const onCursor = useCallback((callback: (pos: { x: number; y: number }) => void) => {
    channel.on('broadcast', { event: 'cursor' }, ({ payload }: any) => callback(payload))
  }, [channel])

  return { broadcastCursor, onCursor }
}

export default useRealtime