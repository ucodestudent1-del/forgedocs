import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

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
                  <div className="h-64 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                    Document workflow platform
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
                    <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Security first</p>
                      <p className="text-sm text-muted-foreground">SOC 2 Type II compliant with end-to-end encryption and granular access controls.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Developer friendly</p>
                      <p className="text-sm text-muted-foreground">REST API, webhooks, and clean documentation for seamless integration.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Team collaboration</p>
                      <p className="text-sm text-muted-foreground">Role-based access, comments, and real-time presence for secure teamwork.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Reliability</p>
                      <p className="text-sm text-muted-foreground">99.9% uptime SLA with automated backups and disaster recovery.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="rounded-xl border border-input bg-card p-8 max-w-md w-full">
                  <div className="h-64 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                    Our values in action
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Trusted by innovative teams</h2>
            <p className="text-muted-foreground">From startups to enterprises, teams rely on ForgeDocs every day.</p>
          </div>
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

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
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
