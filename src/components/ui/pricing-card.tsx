"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  name: string
  price: string
  interval?: string
  description?: string
  features: string[]
  ctaText: string
  ctaHref: string
  isFeatured?: boolean
  priceId?: string | null
  trialDays?: number
  onCheckout?: (priceId: string, trialDays?: number) => void
  checkoutLoading?: string | null
}

export function PricingCard({
  name,
  price,
  interval = "/mo",
  description,
  features,
  ctaText,
  ctaHref,
  isFeatured = false,
  priceId = null,
  trialDays,
  onCheckout,
  checkoutLoading = null,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border p-8 flex flex-col h-full",
        isFeatured
          ? "border-primary bg-[hsl(var(--primary)/0.08)] ring-1 ring-primary/30 shadow-[0_20px_40px_-12px_rgba(59,130,246,0.15)] relative"
          : "border-input bg-background shadow-sm"
      )}
    >
      {isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground uppercase tracking-tighter shadow-sm shadow-primary/20">
          Most popular
        </span>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
        <div className="mt-4 flex items-baseline">
          <span className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
            {price}
          </span>
          <span className="text-sm text-muted-foreground ml-1.5">{interval}</span>
        </div>
      </div>
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-success flex-shrink-0 mt-[3px] text-sm">✓</span>
            <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>
      {priceId && onCheckout ? (
        <button
          onClick={() => onCheckout(priceId, trialDays)}
          disabled={checkoutLoading === name}
          className={cn(
            "w-full py-4 rounded-[10px] font-semibold text-center block transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isFeatured
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/35"
              : "border border-input bg-background text-foreground hover:bg-accent hover:border-primary/50"
          )}
        >
          {checkoutLoading === name ? "Creating checkout..." : ctaText}
        </button>
      ) : (
        <Link href={ctaHref} className="block">
          <a
            className={cn(
              "w-full py-4 rounded-[10px] font-semibold text-center block transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isFeatured
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/35"
                : "border border-input bg-background text-foreground hover:bg-accent hover:border-primary/50"
            )}
          >
            {ctaText}
          </a>
        </Link>
      )}
    </div>
  )
}
