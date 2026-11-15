"use client"

import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import {
  FileText,
  Users,
  Shield,
  Settings,
  HelpCircle,
  GraduationCap,
  Mail,
  Clock,
  ExternalLink,
  ChevronRight,
  Search,
} from "lucide-react"

const helpCategories = [
  {
    title: "Getting Started",
    icon: GraduationCap,
    articles: [
      { title: "Creating Your First Document", desc: "Learn how to create your first document in ForgeDocs", time: "3 min" },
      { title: "Understanding the Dashboard", desc: "Overview of the dashboard interface and features", time: "4 min" },
      { title: "Supported File Formats", desc: "List of all supported document formats", time: "2 min" },
    ],
  },
  {
    title: "Document Management",
    icon: FileText,
    articles: [
      { title: "Creating and Editing Documents", desc: "How to create and edit documents", time: "5 min" },
      { title: "Using Templates", desc: "Generate documents from templates", time: "4 min" },
      { title: "Document Version History", desc: "View and restore previous versions", time: "3 min" },
    ],
  },
  {
    title: "Conversion & Export",
    icon: Settings,
    articles: [
      { title: "Converting Between Formats", desc: "Convert documents to different formats", time: "4 min" },
      { title: "Export Options", desc: "Export options: PDF, DOCX, HTML, MD", time: "3 min" },
    ],
  },
  {
    title: "Team Collaboration",
    icon: Users,
    articles: [
      { title: "Inviting Team Members", desc: "Invite collaborators to your workspace", time: "3 min" },
      { title: "Roles and Permissions", desc: "Manage user roles and access levels", time: "4 min" },
      { title: "Sharing Documents", desc: "Share documents securely with others", time: "3 min" },
    ],
  },
  {
    title: "E-Signatures",
    icon: FileText,
    articles: [
      { title: "Sending Documents for Signature", desc: "Send documents for electronic signature", time: "4 min" },
      { title: "Managing Signature Requests", desc: "Track and manage signature requests", time: "3 min" },
    ],
  },
  {
    title: "Security & Compliance",
    icon: Shield,
    articles: [
      { title: "Two-Factor Authentication (2FA)", desc: "Enable 2FA for your account", time: "3 min" },
      { title: "Data Encryption and Storage", desc: "How your data is encrypted and stored", time: "3 min" },
      { title: "SOC 2 and GDPR Compliance", desc: "ForgeDocs compliance certifications", time: "4 min" },
    ],
  },
  {
    title: "Account & Billing",
    icon: Settings,
    articles: [
      { title: "Subscription Plans", desc: "Choose the right plan for your needs", time: "3 min" },
      { title: "Managing Your Subscription", desc: "Upgrade, downgrade, or cancel", time: "3 min" },
      { title: "Usage Limits and Quotas", desc: "Understand your usage limits", time: "3 min" },
    ],
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Help Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers to common questions about ForgeDocs. Browse our documentation, tutorials, and troubleshooting guides.
          </p>
          <div className="relative max-w-xl mx-auto">
            <input
              type="search"
              placeholder="Search help articles..."
              className="w-full pl-12 pr-4 py-3 border border-input bg-background rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="mt-6 text-muted-foreground">
            Can't find what you're looking for? <Link href="/contact" className="text-primary hover:underline font-medium">Contact support</Link>
          </p>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {helpCategories.map((category) => (
              <div key={category.title} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">{category.articles.length} articles</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.articles.map((article, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-lg font-medium">{article.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{article.desc}</p>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <span className="text-xs text-muted-foreground">{article.time}</span>
                          <Link href="#" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            Read article
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
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
                <Mail className="h-4 w-4 mr-2" />
                Email Us
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"