import LoginForm from "./login-form"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { isGuestMode } from "@/lib/guest-session"

export default function LoginPage() {
  // Free-tier guest mode bypasses the standard authentication workflow entirely.
  // When enabled there is no login prompt — users go straight to the dashboard.
  if (isGuestMode()) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background px-4">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
