import { redirect } from "next/navigation"
import { Suspense } from "react"
import { isGuestMode } from "@/lib/guest-session"
import LoginForm from "./login-form"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  if (isGuestMode()) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background px-4">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
