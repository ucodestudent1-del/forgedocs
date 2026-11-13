import { Metadata } from "next"
import { MarketingLayout } from "@/components/marketing/layout"

export const metadata: Metadata = {
  title: "Privacy Policy - ForgeDocs",
  description: "How ForgeDocs collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground mb-10">Your privacy is important to us. Full privacy policy coming soon.</p>
        </div>
      </main>
    </MarketingLayout>
  )
}
