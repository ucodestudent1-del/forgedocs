import { createRouteClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import OnboardingClient from "./onboarding-client"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createRouteClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed, onboarding_responses, full_name, email")
    .eq("id", user.id)
    .single()

  const onboardingCompleted = profile?.onboarding_completed ?? false

  // If onboarding already completed, bypass to dashboard
  if (onboardingCompleted) {
    redirect("/dashboard")
  }

  return (
    <OnboardingClient
      currentStep={profile?.onboarding_step ?? 1}
      completed={false}
      userEmail={user.email ?? null}
      userFullName={profile?.full_name ?? null}
      userId={user.id}
      existingResponses={(profile?.onboarding_responses as Record<string, any> | null) ?? {}}
    />
  )
}
