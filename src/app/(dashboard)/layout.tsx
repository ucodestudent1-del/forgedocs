import DashboardClient from "./dashboard-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TEMPORARILY DISABLED: Auth check removed for development
  return (
    <DashboardClient
      userEmail="dev@local"
      userInitial="D"
      children={children}
    />
  )
}
