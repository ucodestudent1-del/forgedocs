export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"
import { redirect } from "next/navigation"
import { isGuestMode, getGuestUserId } from "@/lib/guest-session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  let effectiveUser = user

  if (!user && isGuestMode()) {
    effectiveUser = {
      id: getGuestUserId(),
      email: null,
    } as any
  }

  if (!effectiveUser) {
    redirect("/auth/login")
  }

  // Check for active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, tier")
    .eq("user_id", effectiveUser.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Allow free-tier users (no subscription or tier "free") to access the dashboard
  const tier = subscription?.tier || "free"
  if (tier !== "free" && (!subscription || subscription.status !== "active")) {
    redirect("/pricing")
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
