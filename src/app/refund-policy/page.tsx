import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Clock, Shield, DollarSign, FileText, Mail } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Refund Policy - ForgeDocs",
  description: "ForgeDocs refund policy for subscriptions and payments.",
  alternates: {
    canonical: "/refund-policy",
  },
  openGraph: {
    title: "Refund Policy - ForgeDocs",
    description: "ForgeDocs refund policy for subscriptions and payments.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/refund-policy`,
    siteName: "ForgeDocs",
  },
}

export const revalidate = 3600

export default function RefundPolicyPage() {
  const lastUpdated = "March 15, 2024"
  const effectiveDate = "March 15, 2024"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Refund Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: <time dateTime={lastUpdated}>{lastUpdated}</time>
          </p>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-muted/50 border border-input rounded-xl p-6">
            <p className="text-muted-foreground text-sm">
              <strong>Effective Date:</strong> {effectiveDate} | <strong>Version:</strong> 1.0
            </p>
          </div>

          <article className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                1. Overview
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                ForgeDocs offers paid subscription plans (Pro and Business) billed monthly or annually
                through Stripe. This Refund Policy explains when you are eligible for a refund and how
                to request one.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                2. Free Trial
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All paid plans include a 14-day free trial. No credit card is required to start the
                trial. You may cancel at any time during the trial period and will not be charged.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                3. Eligibility for Refunds
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You may request a refund within <strong>30 days</strong> of your initial payment if:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>You were charged in error or without authorization</li>
                  <li>You canceled your subscription within the first 30 days and have not used the service</li>
                  <li>ForgeDocs is unable to provide the service due to a technical issue within our control</li>
                </ul>
                <p>
                  Refunds are issued at ForgeDocs' sole discretion. Refunds for payments older than 30 days
                  are generally not provided.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                4. How to Request a Refund
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>To request a refund, contact us at <strong>billing@forgedocs.com</strong> with:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Your registered email address</li>
                  <li>Your subscription or invoice ID</li>
                  <li>The reason for your refund request</li>
                </ul>
                <p>
                  Refund requests are reviewed within 5 business days. Approved refunds are processed
                  back to the original payment method within 5–10 business days, depending on your bank.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                5. Contact
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>For questions about this Refund Policy or to request a refund:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email: <a href="mailto:billing@forgedocs.com" className="text-primary hover:underline">billing@forgedocs.com</a></li>
                  <li>Address: ForgeDocs Inc., San Francisco, CA</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                6. Changes to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Refund Policy periodically. Material changes will be communicated via
                email at least 30 days before taking effect. The "Last Updated" date above indicates the
                most recent revision.
              </p>
            </section>
          </article>
        </div>
      </section>
      <Footer />
    </div>
  )
}
