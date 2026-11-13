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
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-8 flex flex-col",
        isFeatured
          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-lg relative"
          : "border-input bg-card"
      )}
    >
      {isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground uppercase tracking-tighter">
          Most popular
        </span>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">{name}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="mt-3 flex items-baseline">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground ml-1">{interval}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-success flex-shrink-0 mt-0.5">✓</span>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className="block">
        <a
          className={cn(
            "w-full py-4 rounded-lg font-medium transition-colors text-center block",
            isFeatured
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-input bg-background text-foreground hover:bg-accent"
          )}
        >
          {ctaText}
        </a>
      </Link>
    </div>
  )
}
