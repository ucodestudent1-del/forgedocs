import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Calendar, Clock, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { Breadcrumb } from "@/components/ui/breadcrumb"

const blogPosts: Record<string, {
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  author: string
  category: string
  readTime: string
}> = {
  "introducing-forgedocs": {
    slug: "introducing-forgedocs",
    title: "Introducing ForgeDocs: The Future of Document Management",
    excerpt: "We're excited to announce ForgeDocs, a modern platform for creating, managing, and converting documents in the cloud.",
    content: `<p>Today we're launching ForgeDocs, a modern document management platform designed for teams that need to create, organize, generate, and convert documents without the usual friction.</p><p>ForgeDocs combines document creation, template generation, format conversion (50+ formats), team collaboration, and electronic signatures into one secure, SOC 2 compliant platform.</p><h2>Key Features</h2><ul><li>Document creation and editing with rich text formatting</li><li>Format conversion between DOCX, PDF, XLSX, PPTX, CSV, and 50+ other formats</li><li>Template-based document generation for proposals, invoices, NDAs, and more</li><li>Team collaboration with role-based access control and real-time presence</li><li>Electronic signatures with full audit trails</li><li>SOC 2 Type II compliance with end-to-end encryption</li></ul><p>Get started today at <a href="/auth/signup">forge docs signup</a>.</p>`,
    date: "2026-01-15",
    author: "Sarah Chen",
    category: "Product",
    readTime: "5 min read",
  },
  "document-conversion-best-practices": {
    slug: "document-conversion-best-practices",
    title: "Document Conversion Best Practices: Preserving Quality Across Formats",
    excerpt: "Learn how to maintain formatting integrity when converting between DOCX, PDF, XLSX, and 50+ other formats.",
    content: `<p>Converting documents between formats can be tricky. Formatting often breaks, images shift, and layout gets lost. Here's how to preserve quality across all 50+ supported formats.</p><h2>Tips for Successful Conversion</h2><ul><li>Use clean, well-structured source documents</li><li>Apply consistent styles before conversion</li><li>Check complex tables after conversion</li><li>Embed fonts when converting to PDF</li><li>Validate output before sharing with clients</li></ul><p>Try our conversion tools at <a href="/dashboard/tools">forge docs tools</a>.</p>`,
    date: "2026-01-22",
    author: "Marcus Johnson",
    category: "Tutorial",
    readTime: "8 min read",
  },
  "team-collaboration-features": {
    slug: "team-collaboration-features",
    title: "New Team Collaboration Features: Comments, Mentions, and Real-time Presence",
    excerpt: "Discover how our latest collaboration tools help teams work together seamlessly on shared documents.",
    content: `<p>Collaboration is at the heart of modern document workflows. ForgeDocs now includes comments, @mentions, and real-time presence indicators so your team can work together on shared documents without stepping on each other.</p><h2>What's New</h2><ul><li>Threaded comments on any document</li><li>@mentions to notify teammates</li><li>Real-time presence showing who's viewing or editing</li><li>Role-based permissions (Admin, Editor, Viewer)</li><li>Activity feed with full audit trails</li></ul><p>Enable collaboration features in your <a href="/dashboard/settings">workspace settings</a>.</p>`,
    date: "2026-02-01",
    author: "Emily Rodriguez",
    category: "Features",
    readTime: "6 min read",
  },
  "security-compliance-update": {
    slug: "security-compliance-update",
    title: "Security & Compliance: SOC 2 Type II Certification Achieved",
    excerpt: "ForgeDocs is now SOC 2 Type II certified. Learn what this means for your data security and compliance requirements.",
    content: `<p>We're proud to announce that ForgeDocs has achieved SOC 2 Type II certification. This independent audit confirms our controls for security, availability, and confidentiality meet rigorous industry standards.</p><h2>What This Means for You</h2><ul><li>Independent verification of our security controls</li><li>AES-256 encryption at rest and TLS 1.3 in transit</li><li>Role-based access control with audit logging</li><li>Regular penetration testing and vulnerability scanning</li><li>GDPR and CCPA compliance support</li></ul><p>Read our full <a href="/privacy">privacy policy</a> and <a href="/terms">terms of service</a>.</p>`,
    date: "2026-02-15",
    author: "David Park",
    category: "Security",
    readTime: "4 min read",
  },
  "api-integration-guide": {
    slug: "api-integration-guide",
    title: "Developer Guide: Integrating ForgeDocs API into Your Workflow",
    excerpt: "Step-by-step tutorial for integrating ForgeDocs document operations, webhooks, and pre-built integrations into your application.",
    content: `<p>ForgeDocs provides a REST API for document operations, webhooks for real-time events, and pre-built integrations with Stripe and Supabase. This guide walks you through integrating ForgeDocs into your application.</p><h2>Getting Started</h2><ol><li>Create an account and generate an API key from your dashboard</li><li>Review the <a href="/help">API documentation</a> for available endpoints</li><li>Make your first API call using your API key in the <code>X-API-Key</code> header</li><li>Set up webhooks for real-time document events</li></ol><p>Base URL: <code>https://api.forgedocs.com/v1</code></p>`,
    date: "2026-02-28",
    author: "Alex Thompson",
    category: "Developer",
    readTime: "12 min read",
  },
  "e-signatures-launch": {
    slug: "e-signatures-launch",
    title: "E-Signatures Now Available: Send, Sign, and Track Documents",
    excerpt: "Our new e-signature feature lets you send documents for signature, track progress, and maintain audit trails.",
    content: `<p>Send documents for electronic signature, track signing progress, and maintain complete audit trails — all within ForgeDocs. No more printing, scanning, or chasing signatures.</p><h2>How It Works</h2><ol><li>Upload your document</li><li>Add signature fields and recipients</li><li>Send for signature with automatic reminders</li><li>Track progress in real-time</li><li>Download the signed document with audit trail</li></ul><p>Available on Professional and Business plans. <a href="/pricing">View pricing</a>.</p>`,
    date: "2026-03-10",
    author: "Lisa Wang",
    category: "Features",
    readTime: "7 min read",
  },
}

export const metadata: Metadata = {
  title: "Blog - ForgeDocs",
  description: "Latest updates, tips, and insights from the ForgeDocs team on document management, productivity, and digital workflows.",
  alternates: {
    canonical: "/blog",
  },
}

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts[(await params).slug]

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.date}>{format(new Date(post.date), "MMM d, yyyy")}</time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{post.readTime}</span>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-4">
            {post.excerpt}
          </p>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-8 text-foreground">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
          <div className="mt-12 pt-8 border-t border-input flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {post.author.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{post.author}</p>
                <p className="text-xs text-muted-foreground">{post.category}</p>
              </div>
            </div>
            <Link href="/blog" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to blog
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
