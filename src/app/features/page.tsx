import Link from "next/link"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
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
              <Link href="/solutions" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Solutions
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
              imagePlaceholder="Document library with folders, tags, and version history"
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
              imagePlaceholder="Template gallery with category filters"
              features={["70+ pre-built templates", "Custom template creation", "Variable field substitution", "Bulk document generation", "Template sharing across teams", "Version-controlled templates"]}
            />

            <FeatureSection
              number="03"
              title="Format Conversion"
              description="Convert between 50+ file formats with one click. Preserve formatting, layout, and styling across all conversions."
              imagePlaceholder="File conversion interface with drag-and-drop upload"
              features={["DOCX ↔ PDF conversion", "XLSX ↔ CSV conversion", "PPTX to PDF", "Image to PDF", "Merge multiple documents", "Batch conversion"]}
            />

            <FeatureSection
              number="04"
              title="Team Collaboration"
              description="Work together securely with role-based access control, comments, and real-time presence."
              imagePlaceholder="Team collaboration interface with user avatars"
              features={["Role-based access (Admin/Editor/Viewer)", "Document comments and mentions", "Real-time presence indicators", "Team workspaces", "Share links with expiration", "Activity feed"]}
            />

            <FeatureSection
              number="05"
              title="Security & Compliance"
              description="Enterprise-grade security with SOC 2 Type II compliance, end-to-end encryption, and comprehensive audit logging."
              imagePlaceholder="Security dashboard with compliance badges"
              features={["SOC 2 Type II compliant", "End-to-end encryption", "SSO / SAML authentication", "Two-factor authentication", "GDPR and CCPA ready", "99.9% uptime SLA"]}
            />

            <FeatureSection
              number="06"
              title="API & Integrations"
              description="Connect ForgeDocs to your existing workflow with our REST API, webhooks, and pre-built integrations."
              imagePlaceholder="API documentation and integration marketplace"
              features={["REST API for document operations", "Webhooks for events", "Stripe billing integration", "Supabase database", "Custom domain support", "Developer documentation"]}
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to streamline your documents?</h2>
            <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">Join thousands of teams using ForgeDocs to move faster.</p>
            <Link href="/auth/signup" className="inline-block px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
              Start for free
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureSection({ number, title, description, imagePlaceholder, features }: { number: string; title: string; description: string; imagePlaceholder: string; features: string[] }) {
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
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
              <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
              {feature}
            </li>
          ))}
        </ul>
            <Link href="/features" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Learn more →
            </Link>
      </div>
      <div className="flex justify-center">
        <div className="rounded-xl border border-input bg-card p-8 max-w-md w-full">
          <div className="h-64 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
            {imagePlaceholder}
          </div>
        </div>
      </div>
    </section>
  )
}
