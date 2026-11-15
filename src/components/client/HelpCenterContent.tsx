"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Search,
  FileText,
  Users,
  Shield,
  Settings,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  ExternalLink,
  CheckCircle,
} from "lucide-react"

const helpCategories = [
  {
    title: "Getting Started",
    icon: FileText,
    articles: [
      { title: "Creating Your First Document", slug: "first-document", readTime: "3 min" },
      { title: "Understanding the Dashboard", slug: "dashboard-overview", readTime: "4 min" },
      { title: "Supported File Formats", slug: "supported-formats", readTime: "2 min" },
      { title: "Keyboard Shortcuts", slug: "keyboard-shortcuts", readTime: "3 min" },
    ],
  },
  {
    title: "Document Management",
    icon: FileText,
    articles: [
      { title: "Creating and Editing Documents", slug: "create-edit-documents", readTime: "5 min" },
      { title: "Using Templates", slug: "using-templates", readTime: "4 min" },
      { title: "Document Version History", slug: "version-history", readTime: "3 min" },
      { title: "Organizing with Folders", slug: "organizing-folders", readTime: "3 min" },
      { title: "Bulk Operations", slug: "bulk-operations", readTime: "4 min" },
    ],
  },
  {
    title: "Conversion & Export",
    icon: Settings,
    articles: [
      { title: "Converting Between Formats", slug: "converting-formats", readTime: "4 min" },
      { title: "Batch Conversion", slug: "batch-conversion", readTime: "3 min" },
      { title: "Export Options (PDF, DOCX, HTML, MD)", slug: "export-options", readTime: "3 min" },
      { title: "Preserving Formatting", slug: "preserving-formatting", readTime: "4 min" },
    ],
  },
  {
    title: "Team Collaboration",
    icon: Users,
    articles: [
      { title: "Inviting Team Members", slug: "inviting-members", readTime: "3 min" },
      { title: "Roles and Permissions", slug: "roles-permissions", readTime: "4 min" },
      { title: "Comments and Mentions", slug: "comments-mentions", readTime: "3 min" },
      { title: "Real-time Co-editing", slug: "realtime-coediting", readTime: "3 min" },
      { title: "Sharing Documents Externally", slug: "sharing-externally", readTime: "3 min" },
    ],
  },
  {
    title: "E-Signatures",
    icon: FileText,
    articles: [
      { title: "Sending Documents for Signature", slug: "sending-signatures", readTime: "4 min" },
      { title: "Managing Signature Requests", slug: "managing-requests", readTime: "3 min" },
      { title: "Audit Trails and Compliance", slug: "audit-trails", readTime: "4 min" },
    ],
  },
  {
    title: "Security & Compliance",
    icon: Shield,
    articles: [
      { title: "Two-Factor Authentication (2FA)", slug: "2fa-setup", readTime: "3 min" },
      { title: "Data Encryption and Storage", slug: "encryption-storage", readTime: "3 min" },
      { title: "SOC 2 and GDPR Compliance", slug: "compliance", readTime: "4 min" },
      { title: "Audit Logs and Activity Tracking", slug: "audit-logs", readTime: "3 min" },
      { title: "Single Sign-On (SSO) Setup", slug: "sso-setup", readTime: "5 min" },
    ],
  },
  {
    title: "API & Integrations",
    icon: Settings,
    articles: [
      { title: "API Authentication", slug: "api-auth", readTime: "4 min" },
      { title: "Webhooks and Events", slug: "webhooks", readTime: "4 min" },
      { title: "Stripe Billing Integration", slug: "stripe-integration", readTime: "3 min" },
      { title: "Supabase Integration", slug: "supabase-integration", readTime: "4 min" },
    ],
  },
  {
    title: "Billing & Account",
    icon: Settings,
    articles: [
      { title: "Subscription Plans and Pricing", slug: "plans-pricing", readTime: "3 min" },
      { title: "Managing Your Subscription", slug: "managing-subscription", readTime: "3 min" },
      { title: "Usage Limits and Quotas", slug: "usage-limits", readTime: "3 min" },
      { title: "Cancelling Your Account", slug: "cancelling-account", readTime: "2 min" },
    ],
  },
]

export function HelpCenterContent() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = helpCategories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.slug.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.articles.length > 0)

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <details
              key={category.title}
              className="group bg-card border border-input rounded-xl overflow-hidden"
              open={expandedCategory === category.title}
              onToggle={() => setExpandedCategory(expandedCategory === category.title ? null : category.title)}
            >
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">{category.articles.length} articles</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-primary group-open:rotate-180 transition-transform">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </summary>
              <div className="px-6 pb-6 border-t border-input animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {category.articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/help/${article.slug}`}
                      className="p-4 bg-muted/50 border border-input rounded-lg hover:border-primary/50 hover:bg-muted transition-all"
                    >
                      <h3 className="font-medium text-foreground mb-1">{article.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{article.readTime}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className="mt-16 p-8 bg-muted/50 border border-input rounded-xl text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">Still need help?</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our support team is here to help. Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
              Contact Support
            </Link>
            <Link href="mailto:support@forgedocs.com" className="px-6 py-3 border border-input bg-background hover:bg-accent text-foreground font-medium rounded-lg transition-colors flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}