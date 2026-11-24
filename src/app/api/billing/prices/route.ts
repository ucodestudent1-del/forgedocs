import { NextResponse } from "next/server"
import { PRICES, getPricesByTier } from "@/lib/billing/prices"
import { withErrorBoundary } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req: Request) => {
  const url = new URL(req.url)
  const tier = url.searchParams.get("tier")

  const prices = tier ? getPricesByTier(tier as "free" | "pro" | "business") : PRICES

  return NextResponse.json({ prices })
})
