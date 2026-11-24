export type PriceTier = "free" | "pro" | "business"

export interface Price {
  id: string
  tier: PriceTier
  interval: "month" | "year"
  amount: number // cents
  name: string
  description: string
  featured?: boolean
}

export const PRICES: Price[] = [
  {
    id: "price_pro_monthly",
    tier: "pro",
    interval: "month",
    amount: 1500,
    name: "Pro",
    description: "For power users and growing teams",
  },
  {
    id: "price_pro_yearly",
    tier: "pro",
    interval: "year",
    amount: 15000,
    name: "Pro (Yearly)",
    description: "For power users and growing teams — save 17%",
    featured: true,
  },
  {
    id: "price_business_monthly",
    tier: "business",
    interval: "month",
    amount: 4900,
    name: "Business",
    description: "For established organizations",
  },
  {
    id: "price_business_yearly",
    tier: "business",
    interval: "year",
    amount: 49000,
    name: "Business (Yearly)",
    description: "For established organizations — save 17%",
  },
]

export const ALLOWED_PRICE_IDS = new Set(PRICES.map((p) => p.id))

export function getPriceById(priceId: string): Price | undefined {
  return PRICES.find((p) => p.id === priceId)
}

export function isAllowedPriceId(priceId: string): boolean {
  return ALLOWED_PRICE_IDS.has(priceId)
}

export function getPricesByTier(tier: PriceTier): Price[] {
  return PRICES.filter((p) => p.tier === tier)
}
