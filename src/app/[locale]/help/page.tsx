import { Metadata } from "next"
import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/marketing/footer"
import { HelpCenterContent } from "@/components/client/HelpCenterContent"

export const metadata: Metadata = {
  title: "Help Center - ForgeDocs",
  description: "Find answers to your questions about ForgeDocs. Browse documentation, tutorials, and troubleshooting guides.",
}

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
            Find answers, explore guides, and learn how to get the most out of ForgeDocs.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Link
              href="#search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Documentation
            </Link>
          </div>
        </div>
      </section>
      <HelpCenterContent />
      <Footer />
    </div>
  )
}