"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, FileText, Zap, Shield, Users, Settings, FileText as FileTextIcon } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Welcome to ForgeDocs",
    description: "Let's get you set up in just a few steps",
    Icon: FileTextIcon,
  },
  {
    id: 2,
    title: "Choose Your First Document",
    description: "Pick a template to start creating professional documents",
    Icon: Zap,
  },
  {
    id: 3,
    title: "Explore Conversions",
    description: "Convert files between 50+ formats with one click",
    Icon: Shield,
  },
  {
    id: 4,
    title: "Invite Your Team",
    description: "Collaborate securely with role-based access control",
    Icon: Users,
  },
  {
    id: 5,
    title: "Configure Billing",
    description: "Upgrade to unlock unlimited documents and priority support",
    Icon: Settings,
  },
]

interface OnboardingPageProps {
  currentStep: number
  completed: boolean
  userEmail: string | null
  userFullName: string | null
}

export default function OnboardingClient({
  currentStep,
  completed,
  userEmail,
  userFullName,
}: OnboardingPageProps) {
  const { toast } = useToast()

  if (completed) {
    return null
  }

  const StepIcon = ONBOARDING_STEPS[currentStep - 1].Icon

  async function goToStep(step: number) {
    const res = await fetch("/api/onboarding/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
    })
    if (res.ok) {
      toast({ title: "Step updated", description: `Moved to step ${step}`, variant: "success" })
      window.location.reload()
    } else {
      toast({ title: "Error", description: "Failed to update step. Please try again.", variant: "destructive" })
    }
  }

  async function completeOnboarding() {
    const res = await fetch("/api/onboarding/complete", {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  index + 1 < currentStep
                    ? "bg-green-500 text-white"
                    : index + 1 === currentStep
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {index + 1 < currentStep ? <CheckCircle className="h-5 w-5" /> : step.id}
                </div>
                <p className="text-xs text-center mt-1 text-muted-foreground max-w-[80px]">
                  {step.title}
                </p>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div className={`absolute top-5 left-[50%] w-full h-1 ${index + 1 < currentStep ? "bg-green-500" : "bg-muted"}`} />
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
            {currentStep === 1 && <StepWelcome email={userEmail} fullName={userFullName} />}
            {currentStep === 2 && <StepChooseTemplate />}
            {currentStep === 3 && <StepExploreConversions />}
            {currentStep === 4 && <StepInviteTeam />}
            {currentStep === 5 && <StepConfigureBilling />}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Back
          </Button>
          <Button
            onClick={() => {
              if (currentStep === ONBOARDING_STEPS.length) {
                completeOnboarding()
              } else {
                goToStep(currentStep + 1)
              }
            }}
            className="ml-auto"
          >
            {currentStep === ONBOARDING_STEPS.length ? "Complete Setup" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {currentStep > 1 && (
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

function StepWelcome({ email, fullName }: { email: string | null; fullName: string | null }) {
  return (
    <div className="space-y-6 text-center">
      <div className="p-6 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Welcome, {fullName || "there"}!</h3>
        <p className="text-muted-foreground">
          Your account <strong>{email}</strong> is ready to use.
        </p>
      </div>
      <ul className="space-y-3 text-left max-w-md mx-auto">
        <li className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Email verified</span>
        </li>
        <li className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <span>Account created</span>
        </li>
        <li className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-purple-600" />
          <span>Ready to create documents</span>
        </li>
      </ul>
    </div>
  )
}

function StepChooseTemplate() {
  return (
    <div className="space-y-6">
      <p className="text-center text-muted-foreground">
        Choose a template to create your first document, or start from scratch.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <TemplateCard
          name="Business Proposal"
          description="Win clients with professional proposals"
          Icon={FileTextIcon}
          href="/document-generator?template=business_proposal"
        />
        <TemplateCard
          name="Commercial Invoice"
          description="Create professional invoices in seconds"
          Icon={FileTextIcon}
          href="/document-generator?template=commercial_invoice"
        />
        <TemplateCard
          name="NDA Agreement"
          description="Protect confidential information"
          Icon={Shield}
          href="/document-generator?template=nondisclosure_agreement"
        />
        <TemplateCard
          name="Meeting Minutes"
          description="Document meetings efficiently"
          Icon={Users}
          href="/document-generator?template=meeting_minutes"
        />
      </div>
      <div className="text-center">
        <Link href="/document-generator">
          <Button variant="outline">Start from Blank Document</Button>
        </Link>
      </div>
    </div>
  )
}

function TemplateCard({ name, description, Icon, href }: { name: string; description: string; Icon: React.ElementType; href: string }) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{name}</h4>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StepExploreConversions() {
  return (
    <div className="space-y-6 text-center">
      <p className="text-muted-foreground max-w-md mx-auto">
        Convert documents, spreadsheets, presentations, and images between 50+ formats.
        Upload a file or paste a URL to get started.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <ConversionExample from="DOCX" to="PDF" />
        <ConversionExample from="XLSX" to="CSV" />
        <ConversionExample from="PDF" to="DOCX" />
        <ConversionExample from="PPTX" to="PDF" />
        <ConversionExample from="JPG" to="PNG" />
        <ConversionExample from="PDF" to="TXT" />
      </div>
      <Link href="/conversion">
        <Button size="lg">Try Conversion Now</Button>
      </Link>
    </div>
  )
}

function ConversionExample({ from, to }: { from: string; to: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <div className="text-2xl font-bold text-primary">{from}</div>
        <ArrowRight className="h-6 w-6 mx-auto my-2 text-muted-foreground" />
        <div className="text-2xl font-bold text-primary">{to}</div>
      </CardContent>
    </Card>
  )
}

function StepInviteTeam() {
  return (
    <div className="space-y-6 text-center">
      <p className="text-muted-foreground max-w-md mx-auto">
        Invite team members to collaborate on documents. Set roles and permissions for secure access control.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <RoleCard name="Admin" description="Full access to all features and settings" permissions={["Manage users", "Billing", "All documents", "Settings"]} />
        <RoleCard name="Editor" description="Create and edit documents" permissions={["Create documents", "Edit own documents", "Convert files"]} />
        <RoleCard name="Viewer" description="Read-only access to shared documents" permissions={["View documents", "Download documents", "Comment"]} />
      </div>
      <Link href="/admin/users">
        <Button variant="outline">Manage Team Members</Button>
      </Link>
    </div>
  )
}

function RoleCard({ name, description, permissions }: { name: string; description: string; permissions: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {permissions.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {p}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function StepConfigureBilling() {
  return (
    <div className="space-y-6 text-center">
      <p className="text-muted-foreground max-w-md mx-auto">
        Upgrade to Pro for unlimited documents, conversions, 100GB storage, and priority support.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard name="Free" price="$0" features={["500 docs/month", "100 conversions/month", "5GB storage", "Community support"]} current />
        <PlanCard name="Pro" price="$15/mo" features={["Unlimited documents", "Unlimited conversions", "100GB storage", "Priority support", "Audit logs", "Advanced templates"]} popular />
      </div>
      <Link href="/billing">
        <Button size="lg">View Plans & Upgrade</Button>
      </Link>
    </div>
  )
}

function PlanCard({ name, price, features, current, popular }: { name: string; price: string; features: string[]; current?: boolean; popular?: boolean }) {
  return (
    <Card className={`relative ${popular ? "border-primary ring-2 ring-primary" : ""}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
          Most Popular
        </div>
      )}
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{name}</CardTitle>
        <div className="text-3xl font-bold mt-2">{price}</div>
        {current && <Badge variant="secondary" className="mt-2">Current Plan</Badge>}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
