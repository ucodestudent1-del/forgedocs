import { redirect } from "next/navigation"
import { isGuestMode } from "@/lib/guest-session"
import SignupForm from "./signup-form"

export default function SignupPage() {
  // Free-tier guest mode bypasses the standard authentication workflow entirely.
  // When enabled there is no signup prompt — users go straight to the dashboard.
  if (isGuestMode()) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SignupForm />
    </div>
  )
}
