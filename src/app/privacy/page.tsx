import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Clock, Shield, FileText, CheckCircle, Users, Globe, Database, Lock, Mail, ExternalLink } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Privacy Policy - ForgeDocs",
  description: "How ForgeDocs collects, uses, and protects your personal data and documents.",
  alternates: {
    canonical: "/privacy",
  },
}

export const revalidate = 3600

export default function PrivacyPage() {
  const lastUpdated = "March 15, 2024"
  const effectiveDate = "March 15, 2024"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Privacy Policy
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
              <strong>Effective Date:</strong> {effectiveDate} | <strong>Version:</strong> 2.0
            </p>
          </div>

          <article className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                1. Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                ForgeDocs Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our document management platform ("Service"). Please read this policy carefully.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                2. Information We Collect
              </h2>
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Information You Provide</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Account Information:</strong> Name, email address, password (hashed), company name, role</li>
                    <li><strong>Profile Information:</strong> Avatar, timezone, language preferences, notification settings</li>
                    <li><strong>Billing Information:</strong> Payment details (processed by Stripe), billing address, tax information</li>
                    <li><strong>Content:</strong> Documents, templates, comments, signatures, and metadata you create or upload</li>
                    <li><strong>Communications:</strong> Support tickets, feedback, survey responses, correspondence</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Automatically Collected Information</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Usage Data:</strong> Feature interactions, API calls, conversion operations, document actions</li>
                    <li><strong>Device Information:</strong> Browser type, operating system, IP address, device identifiers</li>
                    <li><strong>Log Data:</strong> Access times, pages viewed, errors, performance metrics</li>
                    <li><strong>Location Data:</strong> Approximate location derived from IP address (country/city level)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Third-Party Sources</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Authentication Providers:</strong> OAuth data from Google, Microsoft, GitHub (if used)</li>
                    <li><strong>Payment Processors:</strong> Transaction data from Stripe</li>
                    <li><strong>Analytics Services:</strong> Aggregated usage data from analytics providers</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                3. How We Use Your Information
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We use collected information for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Service Delivery:</strong> Provide, maintain, and improve the Service</li>
                  <li><strong>Account Management:</strong> Create accounts, authenticate users, manage subscriptions</li>
                  <li><strong>Document Processing:</strong> Store, convert, generate, and secure your documents</li>
                  <li><strong>Collaboration:</strong> Enable team features, sharing, comments, and real-time editing</li>
                  <li><strong>Security:</strong> Detect fraud, prevent abuse, enforce Terms of Service</li>
                  <li><strong>Communication:</strong> Send service updates, billing notices, support responses</li>
                  <li><strong>Analytics:</strong> Understand usage patterns, improve features, measure performance</li>
                  <li><strong>Legal Compliance:</strong> Comply with legal obligations, respond to lawful requests</li>
                  <li><strong>Marketing:</strong> Send promotional communications (with your consent, opt-out available)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                4. Information Sharing and Disclosure
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We do not sell your personal information. We may share information only in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Service Providers:</strong> With vendors who perform services on our behalf (hosting, analytics, email, payments) under strict confidentiality agreements</li>
                  <li><strong>Team Collaboration:</strong> With other users in your organization/workspace as you configure</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                  <li><strong>Safety:</strong> To protect rights, property, or safety of ForgeDocs, users, or the public</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice)</li>
                  <li><strong>Aggregated Data:</strong> Anonymous, aggregated analytics that cannot identify individuals</li>
                  <li><strong>With Your Consent:</strong> For any other purpose with your explicit permission</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                5. Data Security
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We implement comprehensive security measures to protect your data:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Encryption:</strong> AES-256 at rest, TLS 1.3 in transit</li>
                  <li><strong>Access Control:</strong> Role-based access, principle of least privilege</li>
                  <li><strong>Authentication:</strong> Bcrypt password hashing, optional 2FA, session management</li>
                  <li><strong>Infrastructure:</strong> SOC 2 Type II certified cloud providers (AWS/GCP)</li>
                  <li><strong>Monitoring:</strong> 24/7 security monitoring, intrusion detection, audit logging</li>
                  <li><strong>Testing:</strong> Annual penetration testing, regular vulnerability scans</li>
                  <li><strong>Incident Response:</strong> Documented incident response plan with 72-hour breach notification</li>
                </ul>
                <p>While we implement strong safeguards, no system is 100% secure. You are responsible for protecting your account credentials and enabling 2FA.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                6. Data Retention
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We retain your information for as long as necessary to provide the Service and fulfill legal obligations:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Account Data:</strong> Retained while your account is active</li>
                  <li><strong>Documents:</strong> Retained until you delete them or your account is terminated</li>
                  <li><strong>Billing Records:</strong> 7 years for tax and legal compliance</li>
                  <li><strong>Logs and Analytics:</strong> 13 months for security and performance</li>
                  <li><strong>Backups:</strong> 90-day rolling encrypted backups</li>
                  <li><strong>Post-Termination:</strong> 30-day grace period for data export, then secure deletion</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                7. Your Rights and Choices
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Depending on your jurisdiction, you may have the following rights:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
                  <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Restriction:</strong> Limit processing of your data</li>
                  <li><strong>Objection:</strong> Object to processing for direct marketing or legitimate interests</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent for processing based on consent</li>
                </ul>
                <p>To exercise these rights, contact us at <a href="mailto:privacy@forgedocs.com" className="text-primary hover:underline">privacy@forgedocs.com</a> or use the account settings panel.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                8. International Data Transfers
              </h2>
              <p className="text-muted-foreground">
                Our servers are located in the United States. If you access the Service from outside the US, your data will be transferred to and processed in the US. We ensure adequate protection through Standard Contractual Clauses and other approved transfer mechanisms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                9. Children's Privacy
              </h2>
              <p className="text-muted-foreground">
                The Service is not intended for children under 13 (or 16 in some jurisdictions). We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                10. Third-Party Links and Integrations
              </h2>
              <p className="text-muted-foreground">
                The Service may contain links to third-party websites or integrate with third-party services (Stripe, Supabase, OAuth providers). We are not responsible for their privacy practices. Review their policies before providing information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                11. Cookies and Tracking Technologies
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We use cookies and similar technologies for:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Essential:</strong> Authentication, session management, security</li>
                  <li><strong>Preferences:</strong> Language, theme, notification settings</li>
                  <li><strong>Analytics:</strong> Usage patterns, performance monitoring (with consent)</li>
                  <li><strong>Marketing:</strong> Campaign effectiveness (with consent, opt-out available)</li>
                </ul>
                <p>You can manage cookie preferences in your browser settings. Disabling essential cookies may break core functionality.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                12. Changes to This Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy periodically. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. The "Last Updated" date at the top indicates the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                13. Contact Us
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>For questions about this Privacy Policy or your data:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email: <a href="mailto:privacy@forgedocs.com" className="text-primary hover:underline">privacy@forgedocs.com</a></li>
                  <li>Address: ForgeDocs Inc., San Francisco, CA</li>
                  <li>Data Protection Officer: <a href="mailto:dpo@forgedocs.com" className="text-primary hover:underline">dpo@forgedocs.com</a></li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                14. California Privacy Rights (CCPA/CPRA)
              </h2>
              <p className="text-muted-foreground">
                California residents have additional rights under the CCPA/CPRA, including the right to know what personal information is collected, the right to delete, the right to opt-out of sale (we do not sell), and the right to non-discrimination. See Section 7 for how to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                15. European Privacy Rights (GDPR)
              </h2>
              <p className="text-muted-foreground">
                If you are in the European Economic Area, you have rights under the GDPR including access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority. Our legal basis for processing includes contract performance, legitimate interests, legal obligations, and consent. See Section 7 for how to exercise these rights.
              </p>
            </section>
          </article>
        </div>
      </section>
      <Footer />
    </div>
  )
}