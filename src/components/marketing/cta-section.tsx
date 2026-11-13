"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CTASectionProps {
  title: string
  description?: string
  ctaText: string
  ctaHref: string
}

export function CTASection({ title, description, ctaText, ctaHref }: CTASectionProps) {
  return (
    <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      {description && (
        <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">{description}</p>
      )}
      <Link href={ctaHref} className="inline-block">
        <a className="px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
          {ctaText}
        </a>
      </Link>
    </div>
  )
}
