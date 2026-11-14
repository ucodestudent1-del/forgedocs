import { Metadata } from "next"
import { MarketingLayout } from "@/components/marketing/layout"

export const metadata: Metadata = {
  title: "Terms of Service - ForgeDocs",
  description: "Terms and conditions for using ForgeDocs.",
}

export default function TermsPage() {
  return (
    <MarketingLayout>
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">Terms of Service</h1>
          <p className="text-lg text-muted-foreground mb-10">By using ForgeDocs, you agree to our terms. Full terms coming soon.</p>
        </div>
      </main>
    </MarketingLayout>
  )
}
