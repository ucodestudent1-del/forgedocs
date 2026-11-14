import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { PricingCard } from "@/components/ui/pricing-card"

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For individuals getting started",
      interval: "/mo",
      features: ["5 documents per month", "3 template uses", "Basic format conversion", "Community support", "1GB storage"],
      ctaText: "Get started free",
      ctaHref: "/auth/signup",
      isFeatured: false,
    },
    {
      name: "Pro",
      price: "$19",
      description: "For growing teams",
      interval: "/mo",
      features: ["Unlimited documents", "Unlimited templates", "All 50+ format conversions", "Priority email support", "Team collaboration", "10GB storage", "Version history", "Custom templates"],
      ctaText: "Start free trial",
      ctaHref: "/auth/signup",
      isFeatured: true,
    },
    {
      name: "Business",
      price: "$49",
      description: "For established organizations",
      interval: "/mo",
      features: ["Everything in Pro", "SSO / SAML authentication", "Advanced analytics & reporting", "Dedicated account manager", "Custom integrations", "100GB storage", "Unlimited version history", "SLA guarantee"],
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
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
          <div className="text-center mb-16 text-xs text-muted-foreground">
            All paid plans include a 14-day free trial. Cancel anytime. No credit card required for Free plan.
          </div>
          <div className="overflow-x-auto border border-input rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-input">
                  <th scope="col" className="pb-4 text-left text-sm font-semibold text-muted-foreground w-1/3">Feature</th>
                  <th scope="col" className="pb-4 text-center text-sm font-semibold text-muted-foreground">Free</th>
                  <th scope="col" className="pb-4 text-center text-sm font-semibold text-muted-foreground">Pro</th>
                  <th scope="col" className="pb-4 text-center text-sm font-semibold text-muted-foreground">Business</th>
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
      <CTASectionWithStyledLink
        title="Still have questions?"
        description="Contact our sales team for a custom quote or demo."
        ctaText="Contact sales"
        ctaHref="/contact"
      />
      <Footer />
    </div>
  )
}

function CTASectionWithStyledLink({ title, description, ctaText, ctaHref }: { title: string; description: string; ctaText: string; ctaHref: string }) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-primary-foreground/90 mb-8">{description}</p>
          <Link href={ctaHref} className="inline-block">
            <a className="px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              {ctaText}
            </a>
          </Link>
        </div>
      </div>
    </section>
  )
}
