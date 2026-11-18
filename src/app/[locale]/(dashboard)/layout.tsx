export const dynamic = "force-dynamic"

import { createRouteClient } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check for active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, tier")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!subscription || subscription.status !== "active") {
    redirect("/pricing")
  }

  const userEmail = user?.email || null
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U"

  return (
    <DashboardClient
      userEmail={userEmail}
      userInitial={userInitial}
      children={children}
    />
  )
}