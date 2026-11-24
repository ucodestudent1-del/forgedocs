"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, DollarSign, Users, Settings } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { apiFetch } from "@/lib/api-client"
import { useState, useEffect } from "react"

interface Price {
  id: string
  tier: string
  interval: "month" | "year"
  amount: number
  name: string
  description: string
  featured?: boolean
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export default function BillingPage() {
  const { toast } = useToast()
  const [prices, setPrices] = useState<Price[]>([])
  const [subscription, setSubscription] = useState<{ tier: string; status: string } | null>(null)
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [pricesRes, subRes] = await Promise.all([
          apiFetch("/api/billing/prices"),
          apiFetch("/api/billing"),
        ])
        if (pricesRes.ok) {
          const data = await pricesRes.json()
          setPrices(data.prices || [])
        }
        if (subRes.ok) {
          const data = await subRes.json()
          setSubscription(data.subscription || null)
        }
      } catch {
        // Swallow; prices fall back to empty and UI shows empty state.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handlePortal = async () => {
    try {
      const csrfRes = await apiFetch("/api/csrf")
      const csrfData = await csrfRes.json()
      const res = await apiFetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfData.csrf_token ? { "X-CSRF-Token": csrfData.csrf_token } : {}),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error || "Unable to open billing portal", variant: "destructive" })
        return
      }
      const data = await res.json()
      if (data.portal_url) {
        window.location.href = data.portal_url
      }
    } catch {
      toast({ title: "Unable to open billing portal", variant: "destructive" })
    }
  }

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription? You'll lose access at the end of the period.")) {
      return
    }
    try {
      const csrfRes = await apiFetch("/api/csrf")
      const csrfData = await csrfRes.json()
      const res = await apiFetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfData.csrf_token ? { "X-CSRF-Token": csrfData.csrf_token } : {}),
        },
        body: JSON.stringify({ cancel_at_period_end: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error || "Cancel failed", variant: "destructive" })
        return
      }
      toast({ title: "Subscription will cancel at period end" })
      setSubscription((prev) => (prev ? { ...prev, status: "canceled" } : prev))
    } catch {
      toast({ title: "Cancel failed", variant: "destructive" })
    }
  }

  const handleChoosePlan = async (priceId: string | null) => {
    if (!priceId) return
    try {
      const csrfRes = await apiFetch("/api/csrf")
      const csrfData = await csrfRes.json()
      const res = await apiFetch("/api/billing", {
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

  const filteredPrices = prices.filter((p) => p.interval === interval)

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="space-y-6 p-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
          <p className="text-muted-foreground">Loading your billing details...</p>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Billing</h1>
            <p className="text-muted-foreground">Manage your subscription and payment method</p>
          </div>
          <div className="flex items-center gap-2">
            {subscription ? (
              <>
                <Button variant="outline" size="sm" onClick={handlePortal}>
                  Manage subscription
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleCancel}
                  disabled={subscription.status !== "active"}
                >
                  Cancel subscription
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handlePortal}>
                Manage subscription
              </Button>
            )}
          </div>
        </div>

        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Status:{" "}
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Button className="w-full lg:w-auto" disabled>
                  Current Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Usage This Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <UsageStat title="Documents" value="--/--" icon={CreditCard} />
              <UsageStat title="Conversions" value="--/--" icon={DollarSign} />
              <UsageStat title="Storage" value="-- MB / -- GB" icon={Users} />
              <UsageStat title="Plan" value={subscription ? subscription.tier : "Free"} icon={Settings} />
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-foreground">Choose a Plan</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={interval === "month" ? "default" : "outline"} onClick={() => setInterval("month")}>
                Monthly
              </Button>
              <Button size="sm" variant={interval === "year" ? "default" : "outline"} onClick={() => setInterval("year")}>
                Annual
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPrices.map((price) => {
                const proPrices = prices.filter((p) => p.tier === "pro")
                const isPopular = price.tier === "pro" && proPrices.some((p) => p.featured && p.id === price.id)
                return (
                  <PlanCard
                    key={price.id}
                    name={price.name}
                    price={formatCurrency(price.amount)}
                    priceId={price.id}
                    description={price.description}
                    features={price.tier === "pro" ? ["Unlimited documents", "Unlimited conversions", "100 GB storage", "Priority support", "Advanced templates", "Audit logs"] : ["Everything in Pro", "SSO/SAML authentication", "Advanced analytics & reporting", "Dedicated account manager", "Custom integrations", "Unlimited version history", "SLA guarantee"]}
                    popular={isPopular}
                    onChoosePlan={handleChoosePlan}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
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

function PlanCard({
  name,
  price,
  priceId,
  description,
  features,
  popular,
  onChoosePlan,
}: {
  name: string
  price: string
  priceId: string | null
  description: string
  features: string[]
  popular: boolean
  onChoosePlan: (priceId: string | null) => void
}) {
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
          disabled={!priceId}
          onClick={() => onChoosePlan(priceId)}
        >
          {priceId ? "Choose Plan" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  )
}
