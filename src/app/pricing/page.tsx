import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { PricingCard } from "@/components/ui/pricing-card"
import { headers } from "next/headers"

export const metadata: Metadata = {
  title: "Pricing - Simple, Transparent Document Management",
  description: "Choose the ForgeDocs plan that fits your team. Professional ($29/mo) and Business ($89/mo). All plans include a 14-day free trial.",
  alternates: {
    canonical: "/pricing",
  },
}

export const revalidate = 60

export default async function PricingPage() {
  const headersList = await headers()
  const nonce = headersList.get("x-csp-nonce")

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "For personal use",
      interval: "/mo",
      features: ["5 documents per month", "10 format conversions", "1GB storage", "Basic templates", "Community support"],
      ctaText: "Get started",
      ctaHref: "/auth/signup",
      isFeatured: false,
    },
    {
      name: "Professional",
      price: "$29",
      description: "For individuals and small teams",
      interval: "/mo",
      features: ["Unlimited documents", "Unlimited templates", "All 50+ format conversions", "Priority email support", "Team collaboration (up to 5 seats)", "20GB storage", "Version history (30 days)", "Custom templates"],
      ctaText: "Start free trial",
      ctaHref: "/auth/signup",
      isFeatured: true,
    },
    {
      name: "Business",
      price: "$89",
      description: "For established organizations",
      interval: "/mo",
      features: ["Everything in Professional", "Unlimited seats", "SSO / SAML authentication", "Advanced analytics & reporting", "Dedicated account manager", "Custom integrations", "100GB storage", "Unlimited version history", "SLA guarantee", "Audit logs"],
      ctaText: "Contact sales",
      ctaHref: "/contact",
      isFeatured: false,
    },
  ]

  const compareFeatures = [
    { label: "Documents per month", free: "5", professional: "Unlimited", business: "Unlimited" },
    { label: "Format conversions", free: "10", professional: "All 50+", business: "All 50+" },
    { label: "Storage", free: "1 GB", professional: "20 GB", business: "100 GB" },
    { label: "Templates", free: "Basic", professional: "Unlimited", business: "Unlimited" },
    { label: "Team collaboration", free: "No", professional: "Yes (up to 5 seats)", business: "Yes (unlimited)" },
    { label: "Version history", free: "No", professional: "30 days", business: "Unlimited" },
    { label: "Priority support", free: "Community", professional: "Email", business: "Dedicated" },
    { label: "SSO / SAML", free: "No", professional: "No", business: "Yes" },
    { label: "Custom integrations", free: "No", professional: "No", business: "Yes" },
    { label: "SLA guarantee", free: "No", professional: "No", business: "Yes" },
    { label: "Audit logs", free: "No", professional: "No", business: "Yes" },
  ]

  return (
    <>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
          <div className="text-center mb-16 text-xs text-muted-foreground">
            All paid plans include a 14-day free trial. Cancel anytime. Credit card required.
          </div>
          <div className="overflow-x-auto border border-input rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-input">
                  <th scope="col" className="pb-4 text-left text-sm font-semibold text-muted-foreground w-1/3">Feature</th>
                  <th scope="col" className="pb-4 text-center text-sm font-semibold text-muted-foreground">Professional</th>
                  <th scope="col" className="pb-4 text-center text-sm font-semibold text-muted-foreground">Business</th>
                </tr>
              </thead>
              <tbody>
                {compareFeatures.map((row) => (
                  <tr key={row.label} className="border-b border-input/50 last:border-0">
                    <td className="py-4 text-sm text-foreground">{row.label}</td>
                    <td className="py-4 text-center text-sm">{row.professional}</td>
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

    <script
      type="application/ld+json"
      nonce={nonce || undefined}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "ForgeDocs",
          description: "Professional document management platform for modern teams. Create, organize, generate, and convert documents in the cloud.",
          brand: {
            "@type": "Brand",
            name: "ForgeDocs",
          },
          offers: [
            {
              "@type": "Offer",
              name: "Professional Plan",
              price: "29.00",
              priceCurrency: "USD",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "29.00",
                priceCurrency: "USD",
                billingDuration: "P1M",
                recurringBilling: true,
              },
              availability: "https://schema.org/InStock",
              validFrom: new Date().toISOString(),
              url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/pricing`,
              description: "For individuals and small teams. Includes unlimited documents, templates, all 50+ format conversions, priority email support, team collaboration (up to 5 seats), 20GB storage, version history (30 days), and custom templates.",
            },
            {
              "@type": "Offer",
              name: "Business Plan",
              price: "89.00",
              priceCurrency: "USD",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "89.00",
                priceCurrency: "USD",
                billingDuration: "P1M",
                recurringBilling: true,
              },
              availability: "https://schema.org/InStock",
              validFrom: new Date().toISOString(),
              url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/pricing`,
              description: "For established organizations. Everything in Professional plus unlimited seats, SSO/SAML authentication, advanced analytics, dedicated account manager, custom integrations, 100GB storage, unlimited version history, SLA guarantee, and audit logs.",
            },
          ],
        }),
      }}
    />
    </>
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
