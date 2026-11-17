"use client"

import { useEffect, useState } from "react"
import { useRealtime } from "./useRealtime"
import { createClient } from "@supabase/supabase-js"

/**
 * Hook for subscribing to real-time document changes
 */
export function useDocumentRealtime(documentId: string, userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [lastChange, setLastChange] = useState<{ type: string; timestamp: number } | null>(null)

  useRealtime(
    "documents",
    `id=eq.${documentId}`,
    {
      onInsert: (payload) => {
        setLastChange({ type: "insert", timestamp: Date.now() })
      },
      onUpdate: (payload) => {
        setLastChange({ type: "update", timestamp: Date.now() })
      },
      onDelete: (payload) => {
        setLastChange({ type: "delete", timestamp: Date.now() })
      }
    }
  )

  return { lastChange }
}

/**
 * Hook for subscribing to real-time signature request changes
 */
export function useSignatureRealtime(signatureRequestId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [lastChange, setLastChange] = useState<{ type: string; timestamp: number } | null>(null)

  useRealtime(
    "signature_requests",
    `id=eq.${signatureRequestId}`,
    {
      onInsert: (payload) => {
        setLastChange({ type: "insert", timestamp: Date.now() })
      },
      onUpdate: (payload) => {
        setLastChange({ type: "update", timestamp: Date.now() })
      },
      onDelete: (payload) => {
        setLastChange({ type: "delete", timestamp: Date.now() })
      }
    }
  )

  return { lastChange }
}

/**
 * Hook for subscribing to real-time notification changes
 */
export function useNotificationsRealtime(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [notifications, setNotifications] = useState<any[]>([])

  useRealtime(
    "notifications",
    `user_id=eq.${userId}`,
    {
      onInsert: (payload) => {
        setNotifications((prev) => [payload.new, ...prev])
      },
      onUpdate: (payload) => {
        setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
      },
      onDelete: (payload) => {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
      }
    }
  )

  return { notifications }
}

export default useDocumentRealtime