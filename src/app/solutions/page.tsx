import Link from "next/link"

export default function SolutionsPage() {
  const solutions = [
    {
      title: "Legal",
      description: "Manage contracts, NDAs, and legal documents with version control and e-signature ready workflows.",
      icon: "📋",
      features: ["Contract lifecycle management", "Version history", "Access controls", "Audit trail", "E-signature ready"],
      cta: "Explore Legal Templates",
    },
    {
      title: "Finance",
      description: "Generate invoices, financial reports, and compliance documents with automated formatting.",
      icon: "💰",
      features: ["Invoice generation", "Financial reporting", "Compliance docs", "Multi-currency support", "Expense tracking"],
      cta: "Explore Finance Templates",
    },
    {
      title: "HR",
      description: "Streamline offer letters, employment agreements, and onboarding documents for new hires.",
      icon: "👥",
      features: ["Offer letter templates", "Onboarding documents", "Policy handbook", "E-signature", "Employee records"],
      cta: "Explore HR Templates",
    },
    {
      title: "Education",
      description: "Create and distribute course materials, certificates, and administrative documents at scale.",
      icon: "🎓",
      features: ["Course materials", "Certificate generation", "Bulk distribution", "Student records", "Syllabus templates"],
      cta: "Explore Education Templates",
    },
    {
      title: "Real Estate",
      description: "Handle leases, purchase agreements, and property documents with secure sharing and e-signatures.",
      icon: "🏠",
      features: ["Lease agreements", "Purchase contracts", "Property disclosures", "Secure sharing", "E-signatures"],
      cta: "Explore Real Estate Templates",
    },
    {
      title: "Healthcare",
      description: "Manage patient forms, consent documents, and medical records with HIPAA-ready safeguards.",
      icon: "🏥",
      features: ["Patient intake forms", "Consent documents", "HIPAA safeguards", "Access controls", "Audit trails"],
      cta: "Explore Healthcare Templates",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                F
              </div>
              <Link href="/" className="text-xl font-bold tracking-tight text-primary">
                ForgeDocs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="/faq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sign in
              </Link>
              <a
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Built for your industry
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              See how ForgeDocs fits your specific workflow with industry-tailored templates and features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((solution) => (
              <SolutionCard key={solution.title} solution={solution} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Why teams choose ForgeDocs</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-12">From startups to enterprises, teams trust ForgeDocs for their document workflows.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-foreground">50+</div>
                <div className="text-sm text-muted-foreground">File formats</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">10M+</div>
                <div className="text-sm text-muted-foreground">Documents processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">SOC 2</div>
                <div className="text-sm text-muted-foreground">Type II compliant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Find your solution</h2>
            <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">Browse our template library or start from scratch.</p>
            <a href="/templates" className="inline-block px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              Browse templates
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

type Solution = {
  title: string
  description: string
  icon: string
  features: string[]
  cta: string
}

function SolutionCard({ solution }: { solution: Solution }) {
  return (
    <div className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        <span className="text-xl">{solution.icon}</span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{solution.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{solution.description}</p>
      <ul className="space-y-2 text-xs text-muted-foreground mb-6">
        {solution.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary">•</span>
            {feature}
          </li>
        ))}
      </ul>
      <a
        href="/templates"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {solution.cta} →
      </a>
    </div>
  )
}
