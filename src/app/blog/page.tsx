import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Blog - ForgeDocs",
  description: "Latest updates, tips, and insights from the ForgeDocs team.",
}

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 border-b border-input bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">F</div>
              <span className="text-xl font-bold tracking-tight text-foreground">ForgeDocs</span>
            </Link>
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">← Back to home</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">Blog</h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-[65ch] mx-auto">
            Latest updates, tips, and insights from the ForgeDocs team. Coming soon.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}