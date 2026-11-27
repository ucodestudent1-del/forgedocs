import { Metadata } from "next"
import Link from "next/link"
import { Search, Home } from "lucide-react"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
}

const QUICK_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Login", href: "/login", icon: Search },
]

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Search className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="mt-4 text-lg text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
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
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary/5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Go home
        </Link>
      </div>
    </div>
  )
}
