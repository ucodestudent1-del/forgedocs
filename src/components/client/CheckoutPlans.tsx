"use client"

import { PricingCard } from "@/components/ui/pricing-card"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

interface CheckoutPlan {
  name: string
  price: string
  interval?: string
  description?: string
  features: string[]
  ctaText: string
  ctaHref: string
  priceId?: string | null
  trialDays?: number
  isFeatured?: boolean
}

export function CheckoutPlans({ plans }: { plans: CheckoutPlan[] }) {
  const { toast } = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const handleCheckout = async (priceId: string, trialDays?: number) => {
    setCheckoutLoading(priceId)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId, trialDays }),
      })
      if (!res.ok) throw new Error("Failed to create checkout session")
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch {
      toast({ title: "Failed to start checkout. Please try again.", variant: "destructive" })
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1100px] mx-auto mb-16">
      {plans.map((plan) => (
        <PricingCard
          key={plan.name}
          {...plan}
          priceId={plan.priceId}
          trialDays={plan.trialDays}
          onCheckout={handleCheckout}
          checkoutLoading={checkoutLoading}
        />
      ))}
    </div>
  )
}
