"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, FileText, Zap, Shield, Users, Settings } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { apiFetch } from "@/lib/api-client"

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Personalization",
    description: "What should we call you?",
    Icon: FileText,
  },
  {
    id: 2,
    title: "Usage",
    description: "What are you planning to use this product for?",
    Icon: Zap,
  },
  {
    id: 3,
    title: "Workspace",
    description: "Are you working alone or with a team?",
    Icon: Users,
  },
]

interface OnboardingPageProps {
  currentStep: number
  completed: boolean
  userEmail: string | null
  userFullName: string | null
  userId: string
  existingResponses: Record<string, any>
}

export default function OnboardingClient({
  currentStep,
  completed,
  userEmail,
  userFullName,
  userId,
  existingResponses,
}: OnboardingPageProps) {
  const { toast } = useToast()
  const [name, setName] = useState(existingResponses.name || userFullName || "")
  const [usage, setUsage] = useState(existingResponses.usage || "")
  const [workspace, setWorkspace] = useState(existingResponses.workspace || "")
  const [saving, setSaving] = useState(false)

  if (completed) {
    return null
  }

  const StepIcon = ONBOARDING_STEPS[currentStep - 1].Icon
  const currentResponses = existingResponses

  useEffect(() => {
    // Pre-fill from existing responses when step changes
    setName(currentResponses.name || userFullName || "")
    setUsage(currentResponses.usage || "")
    setWorkspace(currentResponses.workspace || "")
  }, [currentStep, currentResponses, userFullName])

  async function saveStep(step: number, responses: Record<string, any>) {
    setSaving(true)
    try {
      const res = await apiFetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, responses }),
      })
      if (!res.ok) {
        throw new Error("Failed to save step")
      }
    } catch {
      toast({ title: "Error", description: "Failed to save progress. Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function goToStep(step: number, responses: Record<string, any>) {
    await saveStep(step, responses)
    if (step > ONBOARDING_STEPS.length) {
      completeOnboarding()
    }
  }

  async function completeOnboarding() {
    const finalResponses = { ...currentResponses, name, usage, workspace }
    await saveStep(ONBOARDING_STEPS.length, finalResponses)
    const res = await apiFetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      toast({ title: "Onboarding complete!", description: "Welcome to ForgeDocs. Your dashboard is ready.", variant: "success" })
      window.location.href = "/dashboard"
    } else {
      toast({ title: "Error", description: "Failed to complete onboarding. Please try again.", variant: "destructive" })
    }
  }

  const canSkip = currentStep > 1

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1 relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    index + 1 < currentStep
                      ? "bg-success text-white"
                      : index + 1 === currentStep
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1 < currentStep ? <CheckCircle className="h-5 w-5" /> : step.id}
                </div>
                <p className="text-xs text-center mt-1 text-muted-foreground max-w-[80px]">
                  {step.title}
                </p>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={`absolute top-5 left-[50%] w-full h-1 ${index + 1 < currentStep ? "bg-success" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center bg-primary/10">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{ONBOARDING_STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{ONBOARDING_STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <StepPersonalization
                name={name}
                setName={setName}
                onSave={() => goToStep(2, { ...currentResponses, name })}
              />
            )}
            {currentStep === 2 && (
              <StepUsage
                usage={usage}
                setUsage={setUsage}
                onSave={() => goToStep(3, { ...currentResponses, usage })}
              />
            )}
            {currentStep === 3 && (
              <StepWorkspace
                workspace={workspace}
                setWorkspace={setWorkspace}
                onSave={() => goToStep(4, { ...currentResponses, workspace })}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => goToStep(Math.max(1, currentStep - 1), currentResponses)}
            disabled={currentStep === 1 || saving}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back
          </Button>
          <Button
            onClick={() => {
              const responses = { ...currentResponses, name, usage, workspace }
              goToStep(currentStep + 1, responses)
            }}
            disabled={saving}
            className="ml-auto"
          >
            {currentStep === ONBOARDING_STEPS.length ? "Complete Setup" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {canSkip && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Step {currentStep} of {ONBOARDING_STEPS.length}
          </p>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Skip onboarding →
          </Link>
        </div>
      </div>
    </div>
  )
}

function StepPersonalization({
  name,
  setName,
  onSave,
}: {
  name: string
  setName: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="p-6 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">What should we call you?</h3>
        <p className="text-muted-foreground">
          We'll use this name to personalize your experience across ForgeDocs.
        </p>
      </div>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full max-w-md mx-auto h-10 px-3 py-2 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        autoComplete="name"
      />
      <p className="text-xs text-muted-foreground">
        This step is optional — you can skip it and update your name later in settings.
      </p>
    </div>
  )
}

function StepUsage({
  usage,
  setUsage,
  onSave,
}: {
  usage: string
  setUsage: (v: string) => void
  onSave: () => void
}) {
  const options = [
    { id: "personal", label: "Personal use", description: "Managing my own documents and files" },
    { id: "team", label: "Team collaboration", description: "Working with colleagues on shared documents" },
    { id: "business", label: "Business operations", description: "Running document workflows for my organization" },
  ]

  return (
    <div className="space-y-4">
      <p className="text-center text-muted-foreground">
        What are you planning to use this product for?
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setUsage(opt.id)
              onSave()
            }}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border transition-colors",
              usage === opt.id
                ? "bg-primary/10 border-primary text-primary"
                : "bg-background border-input hover:bg-accent text-foreground"
            )}
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${
              usage === opt.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {opt.id === "personal" ? <Zap className="h-5 w-5" /> : opt.id === "team" ? <Users className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            </div>
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onSave} disabled={!usage}>
          Save & Continue
        </Button>
      </div>
    </div>
  )
}

function StepWorkspace({
  workspace,
  setWorkspace,
  onSave,
}: {
  workspace: string
  setWorkspace: (v: string) => void
  onSave: () => void
}) {
  const options = [
    { id: "alone", label: "Working alone", description: "Just me, managing my own workspace" },
    { id: "team", label: "With a team", description: "Collaborating with teammates" },
  ]

  return (
    <div className="space-y-4">
      <p className="text-center text-muted-foreground">
        Are you working alone or with a team?
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setWorkspace(opt.id)
              onSave()
            }}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg border transition-colors",
              workspace === opt.id
                ? "bg-primary/10 border-primary text-primary"
                : "bg-background border-input hover:bg-accent text-foreground"
            )}
          >
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${
              workspace === opt.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {opt.id === "alone" ? <Shield className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground text-center">{opt.description}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onSave} disabled={!workspace}>
          Save & Complete
        </Button>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
