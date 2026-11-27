import { redirect } from "next/navigation"
import { Suspense } from "react"
import { isGuestMode } from "@/lib/guest-session"
import SignupForm from "./signup-form"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  if (isGuestMode()) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background px-4">Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
