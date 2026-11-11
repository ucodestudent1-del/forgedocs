"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Menu,
  X,
  FileText,
  File,
  Zap,
  Shield,
  Users,
  Settings,
  ArrowRight,
  CheckCircle2,
  Mail,
  Globe,
  BarChart3,
  Layers,
  Rocket,
  GlobeIcon,
  Lock,
  Clock,
  Plus,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col [scroll-behavior:smooth]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#E2E8F0] bg-[#FFFFFF]/80 backdrop-blur supports-[backdrop-filter]:bg-[#FFFFFF]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-[#0F172A]">ForgeDocs</span>
              </Link>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors">
                Features
              </a>
              <a href="#solutions" className="text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors">
                Solutions
              </a>
              <a href="#pricing" className="text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors">
                Pricing
              </a>
              <a href="#faq" className="text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors">
                FAQ
              </a>
              <Link href="/auth/signup" className="px-4 py-2 text-sm font-medium rounded-md bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className="fixed inset-0 z-40 bg-[#0F172A]/90 backdrop-blur-lg hidden lg:flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex items-center justify-between w-full max-w-md">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0F172A]">ForgeDocs</span>
          </Link>
          <button className="p-2 text-white" onClick={() => {}}>
            <X className="h-6 w-6" />
          </button>
        </div>
          <nav className="mt-6 space-y-4">
            <a href="#features" className="text-lg font-medium text-white hover:text-[#94A3B8] transition-colors">
              Features
            </a>
            <a href="#solutions" className="text-lg font-medium text-white hover:text-[#94A3B8] transition-colors">
              Solutions
            </a>
            <a href="#pricing" className="text-lg font-medium text-white hover:text-[#94A3B8] transition-colors">
              Pricing
            </a>
          <Link href="/auth/signup" className="mt-4 block px-6 py-2 text-center font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors">
            Get started
          </Link>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[#2563EB]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#0F172A]/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2563EB]/10 px-3 py-1 text-[10px] font-medium text-[#2563EB] uppercase tracking-tighter mb-8">
              DOCUMENT MANAGEMENT, SIMPLIFIED
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0F172A] mb-6 leading-[1.1]">
              Professional <span className="text-[#2563EB]">document management</span> for modern teams
            </h1>

            <p className="text-lg md:text-xl text-[#64748B] max-w-[65ch] mx-auto mb-10 leading-relaxed">
              Create, organize, generate, and convert documents in the cloud. One platform for every document workflow.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-[#2563EB]/30"
              >
                Start building
              </Link>
              <a
                href="#features"
                className="px-8 py-4 bg-[#FFFFFF] text-[#0F172A] font-medium rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
              >
                Browse templates
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 text-xs font-medium uppercase tracking-tighter text-[#64748B]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                SOC 2 compliant
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-4 w-4 text-[#2563EB]" />
                End-to-end encrypted
              </span>
              <span className="flex items-center gap-1">
                <GlobeIcon className="h-4 w-4 text-[#2563EB]" />
                GDPR ready
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute -inset-1 bg-[#0F172A]/5 rounded-[1.25rem] blur-[20px]"></div>
          <div className="relative z-10 rounded-[1.25rem] border border-[#E2E8F0] bg-[#FFFFFF] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-6 px-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#2563EB] flex items-center justify-center text-[9px] font-bold text-white">
                  F
                </div>
                <span className="text-sm font-medium text-[#0F172A]">ForgeDocs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="w-64 h-9 px-3 py-1 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 transition-colors"
                />
                <div className="h-9 w-9 rounded-md bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[10px] font-medium text-[#64748B]">
                  JD
                </div>
                <button className="h-8 px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors">
                  Upgrade
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="h-8 w-8 rounded-md bg-[#0F172A]/5 flex items-center justify-center text-[#0F172A]">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#0F172A]">My Documents</p>
                        <p className="text-xs text-[#64748B]">124 documents</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                      <div className="h-8 w-8 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#0F172A]">Create Document</p>
                        <p className="text-xs text-[#64748B]">Blank document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                      <div className="h-8 w-8 rounded-md bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#0F172A]">New Template</p>
                        <p className="text-xs text-[#64748B]">From gallery</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2 h-64">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                          <div className="h-10 w-10 rounded-md bg-[#F8FAFC] flex items-center justify-center text-[#64748B]">
                            <Rocket className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-3/4 rounded bg-[#F1F5F9]"></div>
                            <div className="h-4 w-1/2 rounded bg-[#F1F5F9] mt-1"></div>
                          </div>
                          <div className="text-xs text-[#64748B] font-medium">
                            Q4 Financial Report
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 h-64">
                      {[5, 6, 7, 8].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                          <div className="h-10 w-10 rounded-md bg-[#F8FAFC] flex items-center justify-center text-[#64748B]">
                            <GlobeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-2/3 rounded bg-[#F1F5F9]"></div>
                            <div className="h-4 w-1/3 rounded bg-[#F1F5F9] mt-1"></div>
                          </div>
                          <div className="text-xs text-[#64748B] font-medium">
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
              <span className="h-8 w-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] font-bold text-sm">
                01
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">Everything you need to manage documents</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">Powerful features built for teams that work with documents every day.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="h-6 w-6 text-[#2563EB]" />}
              title="Document Management"
              description="Create, organize, version, and share documents with your team. Full audit trail and granular access control."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-[#2563EB]" />}
              title="Instant Generation"
              description="Generate professional documents from pre-built templates for proposals, invoices, NDAs, and more."
            />
            <FeatureCard
              icon={<Layers className="h-6 w-6 text-[#2563EB]" />}
              title="Format Conversion"
              description="Convert between DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats with one click."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6 text-[#2563EB]" />}
              title="Team Collaboration"
              description="Role-based access control, comments, and real-time collaboration for secure teamwork."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-[#2563EB]" />}
              title="Enterprise Security"
              description="SOC 2 Type II compliant, end-to-end encryption, and granular permissions for every document."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6 text-[#2563EB]" />}
              title="Fast Search"
              description="Instantly search across all your documents with advanced filtering and relevance ranking."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">How it works</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">Get started in three simple steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard number="01" title="Upload your document" description="Upload any document file or paste content directly into ForgeDocs. Supports 50+ file formats including DOCX, PDF, XLSX, PPTX, CSV, and ODT." />
            <StepCard number="02" title="Choose your action" description="Select what you want to do: convert format, generate from template, edit content, or collaborate with your team in real-time." />
            <StepCard number="03" title="Download or share" description="Download your processed document or share it securely with team members via link with role-based access control." />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">Built with security in mind</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">Your documents are protected by industry-standard security practices.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <TrustCard icon={<Lock className="h-6 w-6 text-[#2563EB]" />} title="End-to-end encryption" description="All documents are encrypted at rest and in transit using AES-256 encryption standards." />
            <TrustCard icon={<Shield className="h-6 w-6 text-[#2563EB]" />} title="Access control" description="Role-based permissions ensure only authorized team members can view or edit sensitive documents." />
            <TrustCard icon={<BarChart3 className="h-6 w-6 text-[#2563EB]" />} title="Audit trails" description="Complete activity logs track every document change, access, and share event for full compliance visibility." />
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50 text-sm font-medium uppercase tracking-tighter text-[#64748B]">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
              SOC 2 Type II
            </span>
            <span className="flex items-center gap-1">
              <GlobeIcon className="h-4 w-4 text-[#2563EB]" />
              GDPR compliant
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-[#2563EB]" />
              AES-256 encryption
            </span>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">Built for your industry</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">See how ForgeDocs fits your specific workflow with industry-tailored templates and features.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Legal</h3>
              <p className="text-sm text-[#64748B]">Manage contracts, NDAs, and legal documents with version control and e-signature ready workflows.</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
              <div className="text-2xl mb-3">💰</div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Finance</h3>
              <p className="text-sm text-[#64748B]">Generate invoices, financial reports, and compliance documents with automated formatting.</p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
              <div className="text-2xl mb-3">👥</div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">HR</h3>
              <p className="text-sm text-[#64748B]">Streamline offer letters, employment agreements, and onboarding documents for new hires.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">Choose the plan that fits your team. All plans include a 14-day free trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">Free</h3>
              <p className="text-sm text-[#64748B]">For individuals getting started</p>
              <div className="mt-3 flex items-baseline">
                <span className="text-3xl font-bold text-[#0F172A]">$0</span>
                <span className="text-sm text-[#64748B] ml-1">/mo</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#2563EB] bg-[#FFFFFF]/5 p-6 ring-1 ring-[#2563EB] shadow-lg">
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">Pro</h3>
              <p className="text-sm text-[#64748B]">For growing teams</p>
              <div className="mt-3 flex items-baseline">
                <span className="text-3xl font-bold text-[#0F172A]">$19</span>
                <span className="text-sm text-[#64748B] ml-1">/mo</span>
              </div>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">Business</h3>
              <p className="text-sm text-[#64748B]">For established organizations</p>
              <div className="mt-3 flex items-baseline">
                <span className="text-3xl font-bold text-[#0F172A]">$49</span>
                <span className="text-sm text-[#64748B] ml-1">/mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-4">Frequently asked questions</h2>
            <p className="text-lg text-[#64748B] max-w-[65ch] mx-auto">Have questions about ForgeDocs? We've got answers.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center cursor-pointer group">
                <h3 className="text-lg font-medium text-[#0F172A]">How do I get started?</h3>
                <ArrowRight className="h-5 w-5 text-[#64748B] group-hover:text-[#2563EB]" />
              </div>
              <div className="p-6 text-sm text-[#64748B]">Sign up for a free account and start creating documents in minutes. No credit card required.</div>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center cursor-pointer group">
                <h3 className="text-lg font-medium text-[#0F172A]">What formats are supported?</h3>
                <ArrowRight className="h-5 w-5 text-[#64748B] group-hover:text-[#2563EB]" />
              </div>
              <div className="p-6 text-sm text-[#64748B]">We support DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats.</div>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center cursor-pointer group">
                <h3 className="text-lg font-medium text-[#0F172A]">Is my data secure?</h3>
                <ArrowRight className="h-5 w-5 text-[#64748B] group-hover:text-[#2563EB]" />
              </div>
              <div className="p-6 text-sm text-[#64748B]">Yes. All documents are encrypted at rest and in transit using AES-256 encryption.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-[#2563EB] p-8 sm:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to organize your documents?</h2>
            <p className="text-[#2563EB]/20 mb-8 max-w-[65ch] mx-auto">Join thousands of teams using ForgeDocs to streamline their document workflow.</p>
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 bg-[#FFFFFF] text-[#2563EB] font-semibold rounded-lg hover:bg-[#F1F5F9] transition-colors shadow-lg shadow-[#2563EB]/30"
            >
              Start for free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-[#0F172A]">ForgeDocs</span>
              </div>
              <p className="text-sm text-[#64748B] max-w-[35ch]">Professional document management for modern teams. Simple, secure, and scalable.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-4 uppercase tracking-tighter">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Features</a></li>
                  <li><a href="#solutions" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Solutions</a></li>
                  <li><a href="#pricing" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Pricing</a></li>
                  <li><a href="#faq" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A] mb-4 uppercase tracking-tighter">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">About</a></li>
                  <li><a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Contact</a></li>
                  <li><a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">Help</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-[#E2E8F0] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#64748B]">© 2026 ForgeDocs Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 hover:border-[#2563EB] transition-colors group">
      <div className="h-11 w-11 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#2563EB] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#0F172A] mb-3">{title}</h3>
      <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-lg">
          {number}
        </div>
        <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
      </div>
      <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
    </div>
  )
}

function TrustCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#2563EB]/50 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB]">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#0F172A] mb-1">{title}</h3>
        <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
