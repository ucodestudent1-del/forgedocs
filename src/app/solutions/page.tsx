import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { PageHeader } from "@/components/marketing/page-header"
import { Scale, DollarSign, Users, GraduationCap, Home, HeartPulse, Package } from "lucide-react"

export default function SolutionsPage() {
  const solutions = [
    {
      title: "Legal",
      description: "Manage contracts, NDAs, and legal documents with version control and e-signature ready workflows.",
      features: ["Contract lifecycle management", "Version history", "Access controls", "Audit trail", "E-signature ready"],
      cta: "Explore Legal Templates",
    },
    {
      title: "Finance",
      description: "Generate invoices, financial reports, and compliance documents with automated formatting.",
      features: ["Invoice generation", "Financial reporting", "Compliance docs", "Multi-currency support", "Expense tracking"],
      cta: "Explore Finance Templates",
    },
    {
      title: "HR",
      description: "Streamline offer letters, employment agreements, and onboarding documents for new hires.",
      features: ["Offer letter templates", "Onboarding documents", "Policy handbook", "E-signature", "Employee records"],
      cta: "Explore HR Templates",
    },
    {
      title: "Education",
      description: "Create and distribute course materials, certificates, and administrative documents at scale.",
      features: ["Course materials", "Certificate generation", "Bulk distribution", "Student records", "Syllabus templates"],
      cta: "Explore Education Templates",
    },
    {
      title: "Real Estate",
      description: "Handle leases, purchase agreements, and property documents with secure sharing and e-signatures.",
      features: ["Lease agreements", "Purchase contracts", "Property disclosures", "Secure sharing", "E-signatures"],
      cta: "Explore Real Estate Templates",
    },
    {
      title: "Healthcare",
      description: "Manage patient forms, consent documents, and medical records with HIPAA-ready safeguards.",
      features: ["Patient intake forms", "Consent documents", "HIPAA safeguards", "Access controls", "Audit trails"],
      cta: "Explore Healthcare Templates",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageHeader
        title="Built for your industry"
        description="See how ForgeDocs fits your specific workflow with industry-tailored templates and features."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {solutions.map((solution) => (
          <SolutionCard key={solution.title} solution={solution} />
        ))}
      </div>
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
      <CTASectionWithStyledLink
        title="Find your solution"
        description="Browse our template library or start from scratch."
        ctaText="Browse templates"
        ctaHref="/templates"
      />
      <Footer />
    </div>
  )
}

function SolutionCard({ solution }: { solution: { title: string; description: string; features: string[]; cta: string } }) {
  return (
    <div className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors">
      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        <SolutionIcon title={solution.title} />
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
      <Link href="/templates" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        {solution.cta}
      </Link>
    </div>
  )
}

function SolutionIcon({ title }: { title: string }) {
  const icons: Record<string, React.ReactNode> = {
    Legal: <Scale className="h-5 w-5" />,
    Finance: <DollarSign className="h-5 w-5" />,
    HR: <Users className="h-5 w-5" />,
    Education: <GraduationCap className="h-5 w-5" />,
    "Real Estate": <Home className="h-5 w-5" />,
    Healthcare: <HeartPulse className="h-5 w-5" />,
  }
  return <div className="flex items-center justify-center">{icons[title] || <Package className="h-5 w-5" />}</div>
}

function CTASectionWithStyledLink({ title, description, ctaText, ctaHref }: { title: string; description: string; ctaText: string; ctaHref: string }) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">{description}</p>
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
