import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { PageHeader } from "@/components/marketing/page-header"
import { CTASection } from "@/components/marketing/cta-section"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Features - Everything You Need to Manage Documents",
  description: "ForgeDocs features: document management, templates, format conversion, team collaboration, security & compliance, API & integrations.",
}

export const revalidate = 60

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-input bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground mb-6">
              Built for teams that work with documents
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Everything you need to manage documents
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              From creation to conversion, ForgeDocs handles every part of your document workflow.
            </p>
          </div>
          <div className="space-y-16">
            <FeatureSection
              number="01"
              title="Document Management"
              description="Create, organize, version, and share documents with your team. Full audit trail and granular access control on every file."
              imageAlt="Document library interface showing folders, tags, version history, and search functionality"
              features={[
                "Unlimited document storage",
                "Version history with rollback",
                "Granular permissions (view/edit/comment)",
                "Full audit trail of all actions",
                "Document search and filtering",
                "Bulk actions and organization",
              ]}
            />
            <FeatureSection
              number="02"
              title="Templates"
              description="Generate professional documents from pre-built templates. Perfect for proposals, invoices, NDAs, meeting minutes, and more."
              imageAlt="Template gallery showing category filters, template previews, and variable field configuration"
              features={["70+ pre-built templates", "Custom template creation", "Variable field substitution", "Bulk document generation", "Template sharing across teams", "Version-controlled templates"]}
            />
            <FeatureSection
              number="03"
              title="Format Conversion"
              description="Convert between 50+ file formats with one click. Preserve formatting, layout, and styling across all conversions."
              imageAlt="File conversion interface with drag-and-drop upload area, format selection, and progress indicator"
              features={["DOCX ↔ PDF conversion", "XLSX ↔ CSV conversion", "PPTX to PDF", "Image to PDF", "Merge multiple documents", "Batch conversion"]}
            />
            <FeatureSection
              number="04"
              title="Team Collaboration"
              description="Work together securely with role-based access control, comments, and real-time presence."
              imageAlt="Team collaboration interface showing user avatars, comments, mentions, and real-time presence indicators"
              features={["Role-based access (Admin/Editor/Viewer)", "Document comments and mentions", "Real-time presence indicators", "Team workspaces", "Share links with expiration", "Activity feed"]}
            />
            <FeatureSection
              number="05"
              title="Security & Compliance"
              description="Enterprise-grade security with SOC 2 Type II compliance, end-to-end encryption, and comprehensive audit logging."
              imageAlt="Security dashboard showing compliance badges, encryption status, and audit log overview"
              features={["SOC 2 Type II compliant", "End-to-end encryption", "SSO / SAML authentication", "Two-factor authentication", "GDPR and CCPA ready", "99.9% uptime SLA"]}
            />
            <FeatureSection
              number="06"
              title="API & Integrations"
              description="Connect ForgeDocs to your existing workflow with our REST API, webhooks, and pre-built integrations."
              imageAlt="API documentation page showing endpoint reference, integration marketplace, and code examples"
              features={["REST API for document operations", "Webhooks for events", "Stripe billing integration", "Supabase database", "Custom domain support", "Developer documentation"]}
            />
          </div>
        </div>
      </section>
      <CTASection
        title="Ready to streamline your documents?"
        description="Join thousands of teams using ForgeDocs to move faster."
        ctaText="Start for free"
        ctaHref="/auth/signup"
      />
      <Footer />
    </div>
  )
}

function FeatureSection({ number, title, description, imageAlt, features }: { number: string; title: string; description: string; imageAlt: string; features: string[] }) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            {number}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="text-success flex-shrink-0 mt-1" aria-hidden="true">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-center">
        <div className="rounded-xl border border-input bg-card p-8 max-w-md w-full">
          <div className="h-64 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
            <img
              src={`/placeholder-feature-${number}.svg`}
              alt={imageAlt}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
              width={500}
              height={350}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
