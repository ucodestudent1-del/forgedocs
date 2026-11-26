import { Metadata } from "next"
import { ClientFaqSection } from "@/components/client/FaqSection"
import { headers } from "next/headers"
import dynamic from "next/dynamic"

const ScrollIndicator = dynamic(() => import("@/components/ui/scroll-indicator").then((mod) => mod.ScrollIndicator), { loading: () => null })
const Navbar = dynamic(() => import("@/components/ui/navbar").then((mod) => mod.Navbar), { loading: () => null })

export const metadata: Metadata = {
  title: "ForgeDocs - Professional Document Management for Modern Teams",
  description: "Create, organize, generate, and convert documents in the cloud. One platform for every document workflow. SOC 2 ready, encrypted at rest & in transit, GDPR ready.",
  keywords: ["document management", "document conversion", "e-signatures", "team collaboration", "SOC 2", "GDPR", "document automation", "PDF tools", "document generation"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ForgeDocs - Professional Document Management for Modern Teams",
    description: "Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com",
    siteName: "ForgeDocs",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ForgeDocs - Professional Document Management",
      },
    ],
  },
}

export const revalidate = 3600

import {
  FileText,
  Zap,
  Shield,
  Users,
  Layers,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  GlobeIcon,
  BarChart3,
  Plus,
  Rocket,
} from "lucide-react"

export default function LandingPage() {

  return (
    <div className="flex flex-col [scroll-behavior:smooth]">
      <ScrollIndicator position="top" />
      <Navbar />

      <a id="main-content" tabIndex={-1} className="sr-only"></a>
      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none hidden md:block" aria-hidden="true"></div>
        <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-foreground/5 rounded-full blur-[120px] pointer-events-none hidden md:block" aria-hidden="true"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium text-primary uppercase tracking-tighter mb-8">
              DOCUMENT MANAGEMENT, SIMPLIFIED
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1] text-balance max-w-[65ch] mx-auto">
              Professional <span className="text-primary">document management</span> for modern teams
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-[65ch] mx-auto mb-10 leading-relaxed">
              Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="/auth/signup" className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 text-lg" aria-label="Start building with ForgeDocs - create a free account">
                Start building
              </a>
              <a href="/features" className="px-8 py-4 bg-background border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors text-lg">
                Learn more
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 text-xs font-medium uppercase tracking-tighter text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                SOC 2 ready
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-4 w-4 text-primary" />
                Encrypted at rest & in transit
              </span>
              <span className="flex items-center gap-1">
                <GlobeIcon className="h-4 w-4 text-primary" />
                GDPR ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute -inset-1 bg-foreground/5 rounded-[1.25rem] blur-[20px]"></div>
          <div className="relative z-10 rounded-[1.25rem] border border-input bg-background shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="bg-muted border-b border-input p-6 px-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-[9px] font-bold text-white">
                  F
                </div>
                <span className="text-sm font-medium text-foreground">ForgeDocs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="w-64 h-9 px-3 py-1 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
                <div className="h-9 w-9 rounded-md bg-background border border-input flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    JD
                  </div>
                  <a href="/auth/login" className="h-8 px-3 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors">
                    Sign in
                  </a>
                </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-input">
                      <div className="h-8 w-8 rounded-md bg-foreground/5 flex items-center justify-center text-foreground">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">My Documents</p>
                        <p className="text-xs text-muted-foreground">124 documents</p>
                      </div>
                    </div>
                    <a href="/auth/signup" className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:bg-muted w-full cursor-pointer transition-colors justify-start">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">Create Document</p>
                          <p className="text-xs text-muted-foreground">Blank document</p>
                        </div>
                      </a>
                    <a href="/dashboard/templates" className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:bg-muted w-full cursor-pointer transition-colors justify-start">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">New Template</p>
                          <p className="text-xs text-muted-foreground">From gallery</p>
                        </div>
                      </a>
                  </div>
                </div>
                <div className="col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 h-64">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-input bg-background cursor-pointer hover:bg-muted transition-colors">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                            <Rocket className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-3/4 rounded bg-muted/50"></div>
                            <div className="h-4 w-1/2 rounded bg-muted/50 mt-1"></div>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Q4 Financial Report
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 h-64">
                      {[5, 6, 7, 8].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-input bg-background cursor-pointer hover:bg-muted transition-colors">
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                            <GlobeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-2/3 rounded bg-muted/50"></div>
                            <div className="h-4 w-1/3 rounded bg-muted/50 mt-1"></div>
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Client Contract NDA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                01
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Everything you need to manage documents</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Powerful features built for teams that work with documents every day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              key="document-management"
              icon={<FileText className="h-6 w-6 text-primary" />}
              title="Document Management"
              description="Create, organize, version, and share documents with your team. Full audit trail and granular access control."
            />
            <FeatureCard
              key="instant-generation"
              icon={<Zap className="h-6 w-6 text-primary" />}
              title="Instant Generation"
              description="Generate professional documents from pre-built templates for proposals, invoices, NDAs, and more."
            />
            <FeatureCard
              key="format-conversion"
              icon={<Layers className="h-6 w-6 text-primary" />}
              title="Format Conversion"
              description="Convert between DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats with one click."
            />
            <FeatureCard
              key="team-collaboration"
              icon={<Users className="h-6 w-6 text-primary" />}
              title="Team Collaboration"
              description="Role-based access control, comments, and real-time collaboration for secure teamwork."
            />
            <FeatureCard
              key="enterprise-security"
              icon={<Shield className="h-6 w-6 text-primary" />}
              title="Enterprise Security"
              description="SOC 2 ready, encryption at rest & in transit, and granular permissions for every document."
            />
            <FeatureCard
              key="fast-search"
              icon={<Clock className="h-6 w-6 text-primary" />}
              title="Fast Search"
              description="Instantly search across all your documents with advanced filtering and relevance ranking."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">How it works</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Get started in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard number="01" title="Upload your document" description="Upload any document file or paste content directly into ForgeDocs. Supports 50+ file formats including DOCX, PDF, XLSX, PPTX, CSV, and ODT." />
            <StepCard number="02" title="Choose your action" description="Select what you want to do: convert format, generate from template, edit content, or collaborate with your team in real-time." />
            <StepCard number="03" title="Download or share" description="Download your processed document or share it securely with team members via link with role-based access control." />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-input">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Built with security in mind</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Your documents are protected by industry-standard security practices.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <TrustCard icon={<Lock className="h-6 w-6 text-primary" />} title="Encryption at rest & in transit" description="All documents are encrypted using AES-256 encryption standards." />
            <TrustCard icon={<Shield className="h-6 w-6 text-primary" />} title="Access control" description="Role-based permissions ensure only authorized team members can view or edit sensitive documents." />
            <TrustCard icon={<BarChart3 className="h-6 w-6 text-primary" />} title="Audit trails" description="Complete activity logs track every document change, access, and share event for compliance visibility." />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 text-sm font-medium uppercase tracking-tighter text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              SOC 2 ready
            </span>
            <span className="flex items-center gap-1">
              <GlobeIcon className="h-4 w-4 text-primary" />
              GDPR compliant
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-primary" />
              AES-256 encryption
            </span>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                02
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Built for your industry</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">See how ForgeDocs fits your specific workflow with industry-tailored templates and features.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-input bg-background p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Legal</h3>
              <p className="text-sm text-muted-foreground">Manage contracts, NDAs, and legal documents with version control and e-signature ready workflows.</p>
            </div>
            <div className="rounded-xl border border-input bg-background p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Finance</h3>
              <p className="text-sm text-muted-foreground">Generate invoices, financial reports, and compliance documents with automated formatting.</p>
            </div>
            <div className="rounded-xl border border-input bg-background p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">HR</h3>
              <p className="text-sm text-muted-foreground">Streamline offer letters, employment agreements, and onboarding documents for new hires.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                03
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Trusted by teams everywhere</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Join thousands of teams streamlining their document workflow with ForgeDocs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TestimonialCard
              name="Sarah Chen"
              role="Legal Counsel, Acme Corp"
              company="Acme Corp"
              rating={5}
              content="ForgeDocs has completely transformed how we handle contracts. The version control and audit trails give us the compliance confidence we need, and the template library saves us hours every week."
            />
            <TestimonialCard
              name="Marcus Rivera"
              role="Finance Director, Globex Inc"
              company="Globex Inc"
              rating={5}
              content="Generating invoices and financial reports used to take all afternoon. Now it's a one-click process. The format conversion is flawless and the collaboration features keep our team in sync."
            />
            <TestimonialCard
              name="Elena Park"
              role="Operations Lead, Hooli LLC"
              company="Hooli LLC"
              rating={4}
              content="The HR templates are a game-changer for onboarding. Offer letters and employment agreements are generated in minutes, not days. Highly recommend for any growing team."
            />
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 text-xs font-medium uppercase tracking-tighter text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              Built for modern teams
            </span>
            <span className="flex items-center gap-1">
              <GlobeIcon className="h-4 w-4 text-primary" />
              Global document workflows
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Choose the plan that fits your team. All plans include a 14-day free trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="For personal use"
              features={[
                "5 documents per month",
                "10 conversions",
                "1 GB storage",
                "Basic templates",
                "Community support",
              ]}
              isFeatured={false}
              ctaText="Get started"
              ctaHref="/auth/signup"
            />
            <PricingCard
              name="Professional"
              price="$29"
              description="For individuals and small teams"
              features={[
                "Unlimited documents",
                "Unlimited conversions",
                "20 GB storage",
                "50 MB max file size",
                "Team collaboration (up to 5 seats)",
                "Priority email support",
                "Version history (30 days)",
                "Custom templates",
              ]}
              isFeatured={true}
              ctaText="Start free trial"
              ctaHref="/auth/signup"
            />
            <PricingCard
              name="Business"
              price="$89"
              description="For established organizations"
              features={[
                "Everything in Professional",
                "Unlimited seats",
                "100 GB storage",
                "100 MB max file size",
                "SSO / SAML authentication",
                "Advanced analytics & reporting",
                "Dedicated account manager",
                "Custom integrations",
                "SLA guarantee",
                "Audit logs",
              ]}
              isFeatured={false}
              ctaText="Contact sales"
              ctaHref="/contact"
            />
          </div>
          <p className="text-center mt-12 text-xs text-muted-foreground">
            All paid plans include a 14-day free trial. Cancel anytime. Credit card required.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Frequently asked questions</h2>
            <p className="text-lg text-muted-foreground max-w-[65ch] mx-auto">Have questions about ForgeDocs? We've got answers.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            <ClientFaqSection
              faqs={[
                {
                  index: 0,
                  question: "How do I get started?",
                  answer: "Sign up for a free account and start creating documents in minutes. No credit card required.",
                },
                {
                  index: 1,
                  question: "What formats are supported?",
                  answer: "We support DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats.",
                },
                {
                  index: 2,
                  question: "Is my data secure?",
                  answer: "Yes. All documents are encrypted at rest and in transit using AES-256 encryption.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to organize your documents?</h2>
            <p className="text-primary-foreground/90 mb-8 max-w-[65ch] mx-auto">Join thousands of teams using ForgeDocs to streamline their document workflow.</p>
            <a href="/auth/signup" className="inline-block px-8 py-4 bg-background text-primary font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 text-lg">
              Start for free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-input bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">ForgeDocs</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-[35ch]">Professional document management for modern teams. Simple, secure, and scalable.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-tighter">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#solutions" className="text-sm text-muted-foreground hover:text-primary transition-colors">Solutions</a></li>
                  <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-tighter">Company</h4>
                <ul className="space-y-2">
                  <li><a href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</a></li>
                  <li><a href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
                  <li><a href="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-input pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ForgeDocs Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</a>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "ForgeDocs",
            description: "Professional document management platform for modern teams. Create, organize, generate, and convert documents in the cloud.",
            brand: {
              "@type": "Brand",
              name: "ForgeDocs",
            },
            offers: [
              {
                "@type": "Offer",
                name: "Free Plan",
                price: "0",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}`,
              },
              {
                "@type": "Offer",
                name: "Professional Plan",
                price: "29.00",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/pricing`,
              },
              {
                "@type": "Offer",
                name: "Business Plan",
                price: "89.00",
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/pricing`,
              },
            ],
          }),
        }}
      />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-input bg-background p-6 hover:border-primary transition-colors">
      <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
          {number}
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-6 rounded-lg border border-input bg-background hover:border-primary/50 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function TestimonialCard({
  name,
  role,
  company,
  rating,
  content,
}: {
  name: string
  role: string
  company: string
  rating: number
  content: string
}) {
  return (
    <div className="rounded-xl border border-input bg-background p-6">
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="text-yellow-400 text-xs" aria-hidden="true">
            {i <= rating ? "★" : "☆"}
          </span>
        ))}
        <span className="sr-only">{rating} out of 5 stars</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{content}"</p>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}, {company}</p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({
  name,
  price,
  description,
  features,
  isFeatured,
  ctaText,
  ctaHref,
}: {
  name: string
  price: string
  description: string
  features: string[]
  isFeatured: boolean
  ctaText: string
  ctaHref: string
}) {
  return (
    <div className={`rounded-xl flex flex-col transition-all duration-300 hover:scale-[1.02] ${isFeatured ? "border border-primary bg-primary/5 ring-1 ring-primary shadow-lg scale-105" : "border border-input bg-background hover:border-primary/50"}`}>
      <div className={`mb-6 ${isFeatured ? "relative" : ""}`}>
        {isFeatured && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
            Most Popular
          </span>
        )}
        <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-2 flex items-baseline">
          <span className="text-3xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground ml-1">/mo</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-success flex-shrink-0 mt-0.5">✓</span>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      <a href={ctaHref} className={`w-full py-3 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-center block ${isFeatured
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-input bg-background text-foreground hover:bg-accent"}`}>
          {ctaText}
        </a>
    </div>
  )
}
