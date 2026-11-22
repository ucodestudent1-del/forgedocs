import { Metadata } from "next"
import Link from "next/link"
import { FileText, Zap, Users, Home } from "lucide-react"

export const metadata: Metadata = {
  title: "Page not found | Dashboard",
  description: "The dashboard page you're looking for doesn't exist.",
}

const QUICK_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: FileText },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
  { label: "Templates", href: "/dashboard/templates", icon: Zap },
  { label: "Tools", href: "/dashboard/tools", icon: Users },
]

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="mt-4 text-lg text-muted-foreground mb-8">
          This dashboard page doesn&apos;t exist.
        </p>

        <div className="space-y-3 mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Quick links
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary/5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
