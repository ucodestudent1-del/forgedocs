import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Clock, Shield, FileText, CheckCircle } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Terms of Service - ForgeDocs",
  description: "Terms and conditions for using ForgeDocs document management platform.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service - ForgeDocs",
    description: "Terms and conditions for using ForgeDocs document management platform.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/terms`,
    siteName: "ForgeDocs",
  },
}

export const revalidate = 3600

export default function TermsPage() {
  const lastUpdated = "March 15, 2024"
  const effectiveDate = "March 15, 2024"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Terms of Service
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
              <strong>Effective Date:</strong> {effectiveDate} | <strong>Version:</strong> 2.1
            </p>
          </div>

          <article className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using ForgeDocs ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                2. Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                ForgeDocs is a cloud-based document management platform that enables users to create, edit, convert, sign, and collaborate on documents. The Service includes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Document creation and editing with rich text formatting</li>
                <li>Format conversion between 50+ file formats</li>
                <li>Template-based document generation</li>
                <li>Electronic signatures and signature workflows</li>
                <li>Team collaboration with role-based access control</li>
                <li>Document storage with encryption at rest and in transit</li>
                <li>API access for programmatic document operations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                3. User Accounts
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>To use certain features, you must register for an account. You agree to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Provide accurate and complete registration information</li>
                  <li>Keep your account credentials secure</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
                <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                4. Subscription Plans and Billing
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>ForgeDocs offers Pro and Business plans with varying features and limits. By subscribing to a paid plan, you agree to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Pay the applicable fees for your selected plan</li>
                  <li>Provide accurate billing information</li>
                  <li>Automatic renewal unless cancelled before the billing period ends</li>
                  <li>Payment processing through Stripe (subject to their terms)</li>
                </ul>
                <p>Refunds are provided according to our refund policy. Contact support for billing inquiries.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                5. User Content and Intellectual Property
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p><strong>Your Content:</strong> You retain all rights to documents and content you create or upload to ForgeDocs. By using the Service, you grant us a limited license to store, process, and display your content solely to provide the Service.</p>
                <p><strong>Our Content:</strong> The Service, its design, features, and functionality (excluding your content) are owned by ForgeDocs and protected by intellectual property laws.</p>
                <p><strong>Feedback:</strong> Any feedback you provide becomes our property and may be used without compensation.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                6. Acceptable Use
              </h2>
              <p className="text-muted-foreground mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt unauthorized access to systems or data</li>
                <li>Interfere with Service operations or other users</li>
                <li>Use the Service for illegal activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                7. Privacy and Data Protection
              </h2>
              <p className="text-muted-foreground mb-4">
                Your privacy is important to us. Our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains how we collect, use, and protect your data. By using the Service, you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                8. Security
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>AES-256 encryption at rest and TLS 1.3 in transit</li>
                  <li>SOC 2 Type II certified infrastructure</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Role-based access control and audit logging</li>
                  <li>Two-factor authentication (2FA) support</li>
                </ul>
                <p>While we strive to protect your data, no system is completely secure. You are responsible for maintaining the security of your account credentials.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                9. Service Availability and Modifications
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We may:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Perform scheduled maintenance with advance notice</li>
                  <li>Modify or discontinue features with reasonable notice</li>
                  <li>Impose usage limits to ensure fair access</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                10. Termination
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You may terminate your account at any time from your account settings. We may suspend or terminate your access if you violate these Terms. Upon termination:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Your right to use the Service immediately ceases</li>
                  <li>We will provide a 30-day window to export your data</li>
                  <li>Provisions that should survive termination will continue</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                11. Disclaimers and Limitation of Liability
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p><strong>AS IS:</strong> The Service is provided "as is" and "as available" without warranties of any kind.</p>
                <p><strong>Limitation:</strong> To the maximum extent permitted by law, ForgeDocs shall not be liable for any indirect, incidental, special, or consequential damages, including loss of data, profits, or business opportunities.</p>
                <p><strong>Cap:</strong> Our total liability shall not exceed the amount you paid in the 12 months preceding the claim.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                12. Indemnification
              </h2>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless ForgeDocs from any claims, damages, or expenses arising from your use of the Service, violation of these Terms, or infringement of third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                13. Governing Law and Disputes
              </h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of Delaware, USA. Any disputes will be resolved through binding arbitration in accordance with the American Arbitration Association rules, except for injunctive relief.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                14. Changes to Terms
              </h2>
              <p className="text-muted-foreground">
                We may update these Terms periodically. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                15. Contact Information
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>For questions about these Terms, contact us at:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email: <a href="mailto:legal@forgedocs.com" className="text-primary hover:underline">legal@forgedocs.com</a></li>
                  <li>Address: ForgeDocs Inc., San Francisco, CA</li>
                </ul>
              </div>
            </section>
          </article>
        </div>
      </section>
      <Footer />
    </div>
  )
}