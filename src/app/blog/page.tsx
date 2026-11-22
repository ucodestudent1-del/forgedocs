import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react"
import { format } from "date-fns"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export const metadata: Metadata = {
  title: "Blog - ForgeDocs",
  description: "Latest updates, tips, and insights from the ForgeDocs team on document management, productivity, and digital workflows.",
  alternates: {
    canonical: "/blog",
  },
}

export const revalidate = 3600

const blogPosts = [
  {
    slug: "introducing-forgedocs",
    title: "Introducing ForgeDocs: The Future of Document Management",
    excerpt: "We're excited to announce ForgeDocs, a modern platform for creating, managing, and converting documents in the cloud.",
    date: "2024-01-15",
    author: "Sarah Chen",
    category: "Product",
    readTime: "5 min read",
  },
  {
    slug: "document-conversion-best-practices",
    title: "Document Conversion Best Practices: Preserving Quality Across Formats",
    excerpt: "Learn how to maintain formatting integrity when converting between DOCX, PDF, XLSX, and 50+ other formats.",
    date: "2024-01-22",
    author: "Marcus Johnson",
    category: "Tutorial",
    readTime: "8 min read",
  },
  {
    slug: "team-collaboration-features",
    title: "New Team Collaboration Features: Comments, Mentions, and Real-time Presence",
    excerpt: "Discover how our latest collaboration tools help teams work together seamlessly on shared documents.",
    date: "2024-02-01",
    author: "Emily Rodriguez",
    category: "Features",
    readTime: "6 min read",
  },
  {
    slug: "security-compliance-update",
    title: "Security & Compliance: SOC 2 Type II Certification Achieved",
    excerpt: "ForgeDocs is now SOC 2 Type II certified. Learn what this means for your data security and compliance requirements.",
    date: "2024-02-15",
    author: "David Park",
    category: "Security",
    readTime: "4 min read",
  },
  {
    slug: "api-integration-guide",
    title: "Developer Guide: Integrating ForgeDocs API into Your Workflow",
    excerpt: "Step-by-step tutorial for integrating ForgeDocs document operations, webhooks, and pre-built integrations into your application.",
    date: "2024-02-28",
    author: "Alex Thompson",
    category: "Developer",
    readTime: "12 min read",
  },
  {
    slug: "e-signatures-launch",
    title: "E-Signatures Now Available: Send, Sign, and Track Documents",
    excerpt: "Our new e-signature feature lets you send documents for signature, track progress, and maintain audit trails.",
    date: "2024-03-10",
    author: "Lisa Wang",
    category: "Features",
    readTime: "7 min read",
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumb />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            ForgeDocs Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Latest updates, tips, and insights on document management, productivity, and digital workflows.
          </p>
        </div>
      </section>
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.slug}
                className="flex flex-col bg-card border border-input rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{post.category}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group"
                  >
                    <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-muted-foreground text-sm mb-4 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-input">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {post.author.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(post.date), "MMM d, yyyy")}</span>
                      <Clock className="h-4 w-4 ml-2" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    Read more
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/blog/all"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              View all posts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}