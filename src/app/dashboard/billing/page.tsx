"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, DollarSign, Users, Settings } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { useState } from "react"

interface PlanCardProps {
  name: string
  price: string
  priceId: string | null
  description: string
  features: string[]
  popular: boolean
  currentTier: string
  onChoosePlan: (priceId: string | null) => void
}

export default function BillingPage() {
  const [tier, setTier] = useState<"pro" | "business">("pro")
  const { toast } = useToast()
  const [mrr, setMrr] = useState(0)

  const tierInfo = {
    pro: {
      name: "Pro",
      price: "$15",
      priceId: "price_pro_monthly",
      description: "For power users and growing teams",
      features: ["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"],
      limits: { documents: null, conversions: null, storage: "100 GB" },
    },
    business: {
      name: "Business",
      price: "$49",
      priceId: "price_business_monthly",
      description: "For established organizations",
      features: ["Everything in Pro", "SSO/SAML authentication", "Advanced analytics & reporting", "Dedicated account manager", "Custom integrations", "Unlimited version history", "SLA guarantee"],
      limits: { documents: null, conversions: null, storage: "500 GB" },
    },
  }

  const currentTier = tierInfo[tier]

  const handleChoosePlan = async (priceId: string | null) => {
    if (!priceId) return
    try {
      const csrfRes = await fetch("/api/csrf")
      const csrfData = await csrfRes.json()

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfData.csrf_token ? { "X-CSRF-Token": csrfData.csrf_token } : {}),
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error || "Checkout failed", variant: "destructive" })
        return
      }

      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (e) {
      toast({ title: "Checkout failed", variant: "destructive" })
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription and usage</p>
        </div>

        {/* Current plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{currentTier.name}</h2>
              <p className="text-muted-foreground text-sm">{currentTier.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-foreground">{currentTier.price}</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Button className="w-full lg:w-auto" disabled>
                Current Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Usage This Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <UsageStat title="Documents Created" value="0/Unlimited" icon={CreditCard} />
              <UsageStat title="Conversions" value="0/Unlimited" icon={DollarSign} />
              <UsageStat title="Storage" value="0 MB / 100 GB" icon={Users} />
              <UsageStat title="MRR" value={`$${mrr}`} icon={Settings} />
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Choose a Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlanCard
                name="Pro"
                price="$15"
                priceId={tierInfo.pro.priceId}
                description="For power users and growing teams"
                features={["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"]}
                popular={tier === "pro"}
                currentTier={tier}
                onChoosePlan={handleChoosePlan}
              />
              <PlanCard
                name="Business"
                price="$49"
                priceId={tierInfo.business.priceId}
                description="For established organizations"
                features={tierInfo.business.features}
                popular={tier === "business"}
                currentTier={tier}
                onChoosePlan={handleChoosePlan}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}

const tierInfo = {
  pro: {
    name: "Pro",
    price: "$15",
    priceId: "price_pro_monthly",
    description: "For power users and growing teams",
    features: ["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"],
    limits: { documents: null, conversions: null, storage: "100 GB" },
  },
  business: {
    name: "Business",
    price: "$49",
    priceId: "price_business_monthly",
    description: "For established organizations",
    features: ["Everything in Pro", "SSO/SAML authentication", "Advanced analytics & reporting", "Dedicated account manager", "Custom integrations", "Unlimited version history", "SLA guarantee"],
    limits: { documents: null, conversions: null, storage: "500 GB" },
  },
}

function UsageStat({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  )
}

function PlanCard({ name, price, priceId, description, features, popular, currentTier, onChoosePlan }: PlanCardProps) {
  const isCurrent = name.toLowerCase() === currentTier

  return (
    <Card className={`relative flex flex-col border ${popular ? "border-primary ring-1 ring-primary" : ""}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Popular
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold text-foreground mb-4">{price}</div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-xs text-primary">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-4">
        <Button
          className="w-full"
          variant="outline"
          disabled={isCurrent || !priceId}
          onClick={() => onChoosePlan(priceId)}
        >
          {isCurrent ? "Current Plan" : "Choose Plan"}
        </Button>
      </CardFooter>
    </Card>
  )
}