export default function FAQPage() {
  const faqs = [
    {
      question: "What file formats does ForgeDocs support?",
      answer: "ForgeDocs supports 50+ file formats including DOCX, PDF, XLSX, PPTX, CSV, ODT, RTF, and more. You can convert between any supported format with one click, preserving formatting and layout.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes. ForgeDocs is SOC 2 Type II compliant with end-to-end encryption, granular access controls, and full audit trails for every document action. All data is encrypted at rest and in transit.",
    },
    {
      question: "Can I collaborate with my team?",
      answer: "Absolutely. ForgeDocs includes role-based access control (Admin, Editor, Viewer), document comments, mentions, and real-time presence indicators for secure teamwork on shared documents.",
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes. All paid plans include a 14-day free trial. No credit card is required to start with the Free plan, which includes 5 documents per month.",
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. You can cancel your subscription at any time from the billing dashboard. Your access continues until the end of your current billing period.",
    },
    {
      question: "How does document conversion work?",
      answer: "Upload any document and select your target format. Our conversion engine handles the rest, preserving formatting, layout, and styling as accurately as possible across all 50+ supported formats.",
    },
    {
      question: "Does ForgeDocs have an API?",
      answer: "Yes. ForgeDocs provides a REST API for document operations, webhooks for real-time events, and pre-built integrations with Stripe and Supabase. Developer documentation is available on request.",
    },
    {
      question: "Where is my data stored?",
      answer: "Your documents are stored securely in Supabase Storage with Row-Level Security policies ensuring only authorized users can access their files. Backups are performed regularly.",
    },
    {
      question: "Can I use my own domain?",
      answer: "Custom domain support is available on the Business plan. Contact our sales team to set up your custom domain.",
    },
    {
      question: "What happens if I exceed my document limit?",
      answer: "On the Free plan, you'll be prompted to upgrade to Pro for unlimited documents. On Pro and Business plans, you won't hit limits for standard usage. Contact us for enterprise-scale needs.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                F
              </div>
              <a href="/" className="text-xl font-bold tracking-tight text-primary">
                ForgeDocs
              </a>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Home
              </a>
              <a href="/pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="/features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="/solutions" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Solutions
              </a>
              <a href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Sign in
              </a>
              <a
                href="/auth/signup"
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get started
              </a>
            </div>
          </div>
        </div>
      </nav>

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
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">Still have questions?</p>
            <a href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Contact support →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-input pb-6 last:border-b-0">
      <button className="w-full flex items-center justify-between text-left text-lg font-medium text-foreground hover:text-primary transition-colors">
        <span>{question}</span>
        <span className="text-muted-foreground">→</span>
      </button>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </div>
  )
}
