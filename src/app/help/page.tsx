import { Metadata } from "next"
import { MarketingLayout } from "@/components/marketing/layout"

export const metadata: Metadata = {
  title: "Help Center - ForgeDocs",
  description: "Find answers to your questions about ForgeDocs.",
}

export default function HelpPage() {
  return (
    <MarketingLayout>
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">Help Center</h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-[65ch] mx-auto">
            Find answers to your questions about ForgeDocs. Documentation coming soon.
          </p>
        </div>
      </main>
    </MarketingLayout>
  )
}
