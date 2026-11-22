export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"
import { AuthHandler } from "@/components/auth/AuthHandler"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"

const IS_BUILD = typeof process !== "undefined" && process.env.NEXT_PHASE === "phase-production-build"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const referer = headersList.get("referer") || ""
  const redirectUrl = referer ? new URL(referer).pathname + new URL(referer).search : "/dashboard"

  const supabase = await createRouteClient()

  let user = null
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch {
      // Supabase unreachable — fall back to guest mode
      user = null
    }
  }

  let effectiveUser = user

  if (!user) {
    if (isGuestMode() || IS_BUILD) {
      effectiveUser = {
        id: getGuestUserId(),
        email: null,
      } as any
    } else {
      redirect(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`)
    }
  }

  if (!effectiveUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }

  let tier = "free"
  if (supabase && !IS_BUILD) {
    try {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, tier")
        .eq("user_id", effectiveUser.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      tier = subscription?.tier || "free"
      if (tier !== "free" && (!subscription || subscription.status !== "active")) {
        // Allow access to dashboard; show warning banner instead of redirecting
        tier = "free"
      }
    } catch {
      // Supabase unreachable — keep default free tier
      tier = "free"
    }
  }

  const userEmail = effectiveUser?.email || null
  const userInitial = effectiveUser?.email?.charAt(0).toUpperCase() || "G"

  return (
    <>
      <AuthHandler />
      <DashboardClient
        userEmail={userEmail}
        userInitial={userInitial}
        children={children}
      />
    </>
  )
}
