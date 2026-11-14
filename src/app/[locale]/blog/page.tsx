import { Metadata } from "next"
import { MarketingLayout } from "@/components/marketing/layout"

export const metadata: Metadata = {
  title: "Blog - ForgeDocs",
  description: "Latest updates, tips, and insights from the ForgeDocs team.",
}

export default function BlogPage() {
  return (
    <MarketingLayout>
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">Blog</h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-[65ch] mx-auto">
            Latest updates, tips, and insights from the ForgeDocs team. Coming soon.
          </p>
        </div>
      </main>
    </MarketingLayout>
  )
}
