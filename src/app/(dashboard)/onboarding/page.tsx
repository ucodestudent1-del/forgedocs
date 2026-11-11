import { createRouteClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import OnboardingClient from "./onboarding-client"

export default async function OnboardingPage() {
  const cookieStore = await cookies()
  const supabase = await createRouteClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step, full_name")
    .eq("id", user.id)
    .single()

  const currentStep = profile?.onboarding_step || 1
  const completed = profile?.onboarding_completed || false

  if (completed) {
    redirect("/dashboard")
  }

  return (
    <OnboardingClient
      currentStep={currentStep}
      completed={completed}
      userEmail={user.email ?? null}
      userFullName={user.user_metadata?.full_name ?? null}
    />
  )
}
