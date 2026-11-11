import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For individuals getting started",
      interval: "/mo",
      features: [
        "5 documents per month",
        "3 template uses",
        "Basic format conversion",
        "Community support",
        "1GB storage",
      ],
      ctaText: "Get started free",
      ctaHref: "/auth/signup",
      isFeatured: false,
    },
    {
      name: "Pro",
      price: "$19",
      description: "For growing teams",
      interval: "/mo",
      features: [
        "Unlimited documents",
        "Unlimited templates",
        "All 50+ format conversions",
        "Priority email support",
        "Team collaboration",
        "10GB storage",
        "Version history",
        "Custom templates",
      ],
      ctaText: "Start free trial",
      ctaHref: "/auth/signup",
      isFeatured: true,
    },
    {
      name: "Business",
      price: "$49",
      description: "For established organizations",
      interval: "/mo",
      features: [
        "Everything in Pro",
        "SSO / SAML authentication",
        "Advanced analytics & reporting",
        "Dedicated account manager",
        "Custom integrations",
        "100GB storage",
        "Unlimited version history",
        "SLA guarantee",
      ],
      ctaText: "Contact sales",
      ctaHref: "/contact",
      isFeatured: false,
    },
  ]

  const compareFeatures = [
    { label: "Documents per month", free: "5", pro: "Unlimited", business: "Unlimited" },
    { label: "Template uses", free: "3", pro: "Unlimited", business: "Unlimited" },
    { label: "Format conversions", free: "Basic", pro: "All 50+", business: "All 50+" },
    { label: "Storage", free: "1 GB", pro: "10 GB", business: "100 GB" },
    { label: "Team collaboration", free: "No", pro: "Yes", business: "Yes" },
    { label: "Version history", free: "No", pro: "Yes", business: "Unlimited" },
    { label: "Priority support", free: "Community", pro: "Email", business: "Dedicated" },
    { label: "SSO / SAML", free: "No", pro: "No", business: "Yes" },
    { label: "Custom integrations", free: "No", pro: "No", business: "Yes" },
    { label: "SLA guarantee", free: "No", pro: "No", business: "Yes" },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Choose the plan that fits your team. All plans include a 14-day free trial.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>

          <div className="text-center mb-16 text-xs text-muted-foreground">
            All paid plans include a 14-day free trial. Cancel anytime. No credit card required for Free plan.
          </div>

          <div className="overflow-x-auto border border-input rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-input">
                  <th className="pb-4 text-left text-sm font-semibold text-muted-foreground w-1/3">Feature</th>
                  <th className="pb-4 text-center text-sm font-semibold text-muted-foreground">Free</th>
                  <th className="pb-4 text-center text-sm font-semibold text-muted-foreground">Pro</th>
                  <th className="pb-4 text-center text-sm font-semibold text-muted-foreground">Business</th>
                </tr>
              </thead>
              <tbody>
                {compareFeatures.map((row) => (
                  <tr key={row.label} className="border-b border-input/50 last:border-0">
                    <td className="py-4 text-sm text-foreground">{row.label}</td>
                    <td className="py-4 text-center text-sm">{row.free}</td>
                    <td className="py-4 text-center text-sm">{row.pro}</td>
                    <td className="py-4 text-center text-sm">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
            <p className="text-primary-foreground/90 mb-8">Contact our sales team for a custom quote or demo.</p>
            <Link href="/contact" className="inline-block px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              Contact sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

type PricingPlan = {
  name: string
  price: string
  description: string
  interval: string
  features: string[]
  ctaText: string
  ctaHref: string
  isFeatured: boolean
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div className={`rounded-2xl border p-8 flex flex-col ${plan.isFeatured ? "border-primary bg-primary/5 ring-1 ring-primary shadow-lg relative" : "border-input bg-card"}`}>
      {plan.isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground uppercase tracking-tighter">
          Most popular
        </span>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
        <div className="mt-3 flex items-baseline">
          <span className="text-4xl font-bold text-foreground">{plan.price}</span>
          <span className="text-sm text-muted-foreground ml-1">{plan.interval}</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-green-500 flex-shrink-0">✓</span>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <a
        href={plan.ctaHref}
        className={`w-full py-4 rounded-lg font-medium transition-colors ${
          plan.isFeatured
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-input bg-background text-foreground hover:bg-accent"
        }`}
      >
        {plan.ctaText}
      </a>
    </div>
  )
}
