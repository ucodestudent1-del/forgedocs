import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { PageHeader } from "@/components/marketing/page-header"
import { CTASection } from "@/components/marketing/cta-section"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "About ForgeDocs - Building Better Document Workflows",
  description: "Learn about ForgeDocs, our story, and our values. Professional document management for modern teams.",
  alternates: {
    canonical: "/about",
  },
}

export const revalidate = 3600

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Building better document workflows
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              ForgeDocs was built to solve the document chaos that slows teams down. From creation to conversion, we make document management effortless.
            </p>
          </div>
          <div className="space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="flex justify-center">
                <div className="rounded-xl border border-input bg-card p-8 max-w-md w-full">
                  <div className="h-64 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">Our story illustration</div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Our story</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Every team struggles with document management. Files scattered across email, different versions floating around, format conversion headaches, and security concerns. We built ForgeDocs to eliminate that friction.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Our platform combines document creation, template generation, format conversion, and team collaboration into one secure, easy-to-use platform.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Our values</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-success flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Security first</p>
                      <p className="text-sm text-muted-foreground">SOC 2 Type II compliant with end-to-end encryption and granular access controls.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-success flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Developer friendly</p>
                      <p className="text-sm text-muted-foreground">REST API, webhooks, and clean documentation for seamless integration.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-success flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Team collaboration</p>
                      <p className="text-sm text-muted-foreground">Role-based access, comments, and real-time presence for secure teamwork.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-success flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Reliability</p>
                      <p className="text-sm text-muted-foreground">99.9% uptime SLA with automated backups and disaster recovery.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="rounded-xl border border-input bg-card p-8 max-w-md w-full">
                  <div className="h-64 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">Our values illustration</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <CTASection
        title="Ready to get started?"
        description="Join thousands of teams using ForgeDocs to streamline their document workflow."
        ctaText="Start for free"
        ctaHref="/signup"
      />
      <Footer />
    </div>
  )
}
