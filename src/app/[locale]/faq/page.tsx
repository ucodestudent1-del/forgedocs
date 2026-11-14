"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"

export default function FAQPage() {
  const faqs = [
    {
      id: "1",
      question: "What file formats does ForgeDocs support?",
      answer: "ForgeDocs supports 50+ file formats including DOCX, PDF, XLSX, PPTX, CSV, ODT, RTF, and more. You can convert between any supported format with one click, preserving formatting and layout.",
    },
    {
      id: "2",
      question: "Is my data secure?",
      answer: "Yes. ForgeDocs is SOC 2 Type II compliant with end-to-end encryption, granular access controls, and full audit trails for every document action. All data is encrypted at rest and in transit.",
    },
    {
      id: "3",
      question: "Can I collaborate with my team?",
      answer: "Absolutely. ForgeDocs includes role-based access control (Admin, Editor, Viewer), document comments, mentions, and real-time presence indicators for secure teamwork on shared documents.",
    },
    {
      id: "4",
      question: "Do you offer a free trial?",
      answer: "Yes. All paid plans include a 14-day free trial. No credit card is required to start with the Free plan, which includes 5 documents per month.",
    },
    {
      id: "5",
      question: "Can I cancel anytime?",
      answer: "Yes. You can cancel your subscription at any time from the billing dashboard. Your access continues until the end of your current billing period.",
    },
    {
      id: "6",
      question: "How does document conversion work?",
      answer: "Upload any document and select your target format. Our conversion engine handles the rest, preserving formatting, layout, and styling as accurately as possible across all 50+ supported formats.",
    },
    {
      id: "7",
      question: "Does ForgeDocs have an API?",
      answer: "Yes. ForgeDocs provides a REST API for document operations, webhooks for real-time events, and pre-built integrations with Stripe and Supabase. Developer documentation is available on request.",
    },
    {
      id: "8",
      question: "Where is my data stored?",
      answer: "Your documents are stored securely in Supabase Storage with Row-Level Security policies ensuring only authorized users can access their files. Backups are performed regularly.",
    },
    {
      id: "9",
      question: "Can I use my own domain?",
      answer: "Custom domain support is available on the Business plan. Contact our sales team to set up your custom domain.",
    },
    {
      id: "10",
      question: "What happens if I exceed my document limit?",
      answer: "On the Free plan, you'll be prompted to upgrade to Pro for unlimited documents. On Pro and Business plans, you won't hit limits for standard usage. Contact us for enterprise-scale needs.",
    },
  ]

  const [openIds, setOpenIds] = useState<string[]>([])

  const toggle = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Frequently asked questions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about ForgeDocs, from pricing to security to getting started.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.id} {...faq} isOpen={openIds.includes(faq.id)} onToggle={toggle} />
            ))}
          </div>
          <div className="mt-16 text-center">
            <p className="text-muted-foreground">Still have questions?</p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Contact support →
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

function FaqItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: (id: string) => void }) {
  return (
    <div className="border-b border-input pb-6 last:border-b-0">
      <button
        onClick={() => onToggle(question)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-lg font-medium text-foreground hover:text-primary transition-colors"
      >
        <span>{question}</span>
        <span className="text-muted-foreground">{isOpen ? "↑" : "→"}</span>
      </button>
      {isOpen && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{answer}</p>}
    </div>
  )
}
