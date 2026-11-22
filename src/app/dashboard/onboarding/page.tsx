import OnboardingClient from "./onboarding-client"

export default function OnboardingPage() {
  // TEMPORARILY DISABLED: Auth check removed for development
  return (
    <OnboardingClient
      currentStep={1}
      completed={false}
      userEmail="dev@local"
      userFullName="Dev User"
    />
  )
}
