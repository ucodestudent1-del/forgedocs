import { createRouteClient } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

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