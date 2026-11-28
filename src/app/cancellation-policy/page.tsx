import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Clock, Shield, Trash2, FileText, Mail } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Cancellation Policy - ForgeDocs",
  description: "ForgeDocs cancellation policy for subscriptions.",
  alternates: {
    canonical: "/cancellation-policy",
  },
  openGraph: {
    title: "Cancellation Policy - ForgeDocs",
    description: "ForgeDocs cancellation policy for subscriptions.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/cancellation-policy`,
    siteName: "ForgeDocs",
  },
}

export const revalidate = 3600

export default function CancellationPolicyPage() {
  const lastUpdated = "March 15, 2024"
  const effectiveDate = "March 15, 2024"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Cancellation Policy
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
                through Stripe. You may cancel your subscription at any time from the billing dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                2. How to Cancel
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You can cancel your subscription in two ways:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Billing Dashboard:</strong> Go to <code>/dashboard/billing</code> and click
                    "Cancel subscription."
                  </li>
                  <li>
                    <strong>Stripe Billing Portal:</strong> Click "Manage subscription" on the billing
                    page to open the Stripe customer portal, where you can cancel or update your payment
                    method.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-primary" />
                3. Cancellation Timing
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  You have two options when canceling:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Cancel at period end:</strong> Your subscription remains active until the
                    end of your current billing period. You continue to have access to paid features
                    until then. No further charges will be applied after the period ends.
                  </li>
                  <li>
                    <strong>Cancel immediately:</strong> Your subscription is canceled immediately and
                    your account reverts to the Free tier. You will lose access to paid features
                    immediately.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                4. Access After Cancellation
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>After your subscription is canceled:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>You retain access to your documents and can view/export them under the Free tier</li>
                  <li>Paid features (priority support, advanced templates, audit logs, etc.) are disabled</li>
                  <li>Your usage limits revert to the Free tier limits</li>
                  <li>Your data is not deleted — you can reactivate your subscription at any time</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                5. Contact
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>For questions about canceling your subscription:</p>
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
                We may update this Cancellation Policy periodically. Material changes will be
                communicated via email at least 30 days before taking effect.
              </p>
            </section>
          </article>
        </div>
      </section>
      <Footer />
    </div>
  )
}
