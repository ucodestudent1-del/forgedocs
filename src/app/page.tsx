import Link from "next/link"

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col [scroll-behavior:smooth]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold tracking-tight text-primary">
                ForgeDocs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="#pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="#features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="#solutions" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Solutions
              </Link>
              <Link href="/auth/signup" className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
            Professional document management for modern teams
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/signup" className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Start building
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 opacity-60">
            <span className="text-sm font-medium uppercase tracking-wider">Secure by design</span>
            <span className="text-sm font-medium uppercase tracking-wider">99.9% uptime</span>
            <span className="text-sm font-medium uppercase tracking-wider">Encrypted at rest</span>
            <span className="text-sm font-medium uppercase tracking-wider">GDPR ready</span>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Trusted by teams everywhere</h2>
            <p className="text-muted-foreground">From startups to enterprises, teams rely on ForgeDocs to move faster.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground">10M+</div>
              <div className="text-sm text-muted-foreground">Documents processed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">50+</div>
              <div className="text-sm text-muted-foreground">File formats supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">24/7</div>
              <div className="text-sm text-muted-foreground">Support available</div>
            </div>
          </div>

          {/* Customer logos */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40 grayscale">
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">ACME</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">Globex</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">Hooli</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">Stark</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">Umbrella</span>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">Wayne</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Everything you need to manage documents</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Powerful features built for teams that work with documents every day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="📄"
              title="Document Management"
              description="Create, organize, version, and share documents with your team. Full audit trail and access control."
            />
            <FeatureCard
              icon="📋"
              title="Templates"
              description="Generate professional documents from pre-built templates for proposals, invoices, NDAs, and more."
            />
            <FeatureCard
              icon="🔄"
              title="Format Conversion"
              description="Convert between DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats with one click."
            />
            <FeatureCard
              icon="🔍"
              title="Full-Text Search"
              description="Instantly search across all your documents with advanced filtering and relevance ranking."
            />
            <FeatureCard
              icon="👥"
              title="Team Collaboration"
              description="Role-based access control, comments, and real-time collaboration for secure teamwork."
            />
            <FeatureCard
              icon="🔒"
              title="Enterprise Security"
              description="End-to-end encryption and granular permissions for every document."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="solutions" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Built for your industry</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">See how ForgeDocs fits your specific workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCaseCard
              title="Legal"
              description="Manage contracts, NDAs, and legal documents with version control and e-signature ready workflows."
              features={["Contract lifecycle management", "Version history", "Access controls", "Audit trail"]}
            />
            <UseCaseCard
              title="Finance"
              description="Generate invoices, financial reports, and compliance documents with automated formatting."
              features={["Invoice generation", "Financial reporting", "Compliance docs", "Multi-currency support"]}
            />
            <UseCaseCard
              title="HR"
              description="Streamline offer letters, employment agreements, and onboarding documents for new hires."
              features={["Offer letter templates", "Onboarding docs", "Policy handbook", "E-signature"]}
            />
            <UseCaseCard
              title="Education"
              description="Create and distribute course materials, certificates, and administrative documents at scale."
              features={["Course materials", "Certificate generation", "Bulk distribution", "Student records"]}
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your team. Upgrade anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="For individuals getting started"
              features={["5 documents/month", "3 template uses", "Basic conversion", "Community support"]}
              isFeatured={false}
              ctaText="Get started free"
              ctaHref="/auth/signup"
            />
            <PricingCard
              name="Pro"
              price="$19"
              description="For growing teams"
              features={["Unlimited documents", "Unlimited templates", "All format conversions", "Priority support", "Team collaboration"]}
              isFeatured={true}
              ctaText="Start free trial"
              ctaHref="/auth/signup"
            />
            <PricingCard
              name="Business"
              price="$49"
              description="For established organizations"
              features={["Everything in Pro", "SSO / SAML", "Advanced analytics", "Dedicated support", "Custom integrations"]}
              isFeatured={false}
              ctaText="Contact sales"
              ctaHref="/contact"
            />
          </div>

          <div className="text-center mt-12 text-xs text-muted-foreground">
            All plans include 14-day free trial. No credit card required for Free plan.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-y">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know about ForgeDocs.</p>
          </div>

          <div className="space-y-4">
            <FaqItem
              question="What file formats does ForgeDocs support?"
              answer="ForgeDocs supports 50+ file formats including DOCX, PDF, XLSX, PPTX, CSV, ODT, and more. You can convert between any supported format with one click."
            />
            <FaqItem
              question="Is my data secure?"
              answer="Yes. ForgeDocs uses end-to-end encryption, granular access controls, and full audit trails for every document action."
            />
            <FaqItem
              question="Can I collaborate with my team?"
              answer="Absolutely. ForgeDocs includes role-based access control, comments, and real-time collaboration features for secure teamwork on shared documents."
            />
            <FaqItem
              question="Do you offer a free trial?"
              answer="Yes. All paid plans include a 14-day free trial. No credit card is required to start with the Free plan."
            />
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes. You can cancel your subscription at any time from the billing dashboard. Your access continues until the end of your billing period."
            />
            <FaqItem
              question="How does document conversion work?"
              answer="Upload any document and select your target format. Our conversion engine handles the rest, preserving formatting and layout as accurately as possible."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to organize your documents?</h2>
            <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">Join thousands of teams using ForgeDocs to streamline their document workflow.</p>
            <Link href="/auth/signup" className="inline-block px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              Start for free
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors group">
      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-4">
        <span className="text-lg">{icon}</span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function UseCaseCard({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <div className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-primary">•</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PricingCard({
  name,
  price,
  description,
  features,
  isFeatured,
  ctaText,
  ctaHref,
}: {
  name: string
  price: string
  description: string
  features: string[]
  isFeatured: boolean
  ctaText: string
  ctaHref: string
}) {
  return (
    <div className={`rounded-2xl border p-6 flex flex-col ${isFeatured ? "border-primary bg-primary/5 ring-1 ring-primary shadow-lg" : "border-input bg-card"}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-green-500 flex-shrink-0">✓</span>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} className={`w-full py-3 rounded-lg font-medium transition-colors ${
        isFeatured
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-input bg-background text-foreground hover:bg-accent"
      }`}>
        {ctaText}
      </Link>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-input pb-4 last:border-b-0">
      <button className="w-full flex items-center justify-between text-left text-lg font-medium text-foreground hover:text-primary transition-colors">
        <span>{question}</span>
        <span className="text-muted-foreground">→</span>
      </button>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </div>
  )
}
