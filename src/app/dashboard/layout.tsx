export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"
import { redirect } from "next/navigation"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createRouteClient()

  let user = null
  if (supabase) {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  }

  let effectiveUser = user

  if (!user) {
    if (isGuestMode()) {
      effectiveUser = {
        id: getGuestUserId(),
        email: null,
      } as any
    } else {
      redirect("/auth/login")
    }
  }

  if (!effectiveUser) {
    redirect("/auth/login")
  }

  let tier = "free"
  if (supabase) {
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
      redirect("/pricing")
    }
  }

  const userEmail = effectiveUser?.email || null
  const userInitial = effectiveUser?.email?.charAt(0).toUpperCase() || "G"

  return (
    <DashboardClient
      userEmail={userEmail}
      userInitial={userInitial}
      children={children}
    />
  )
}
