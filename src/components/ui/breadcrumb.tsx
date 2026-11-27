"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const breadcrumbRoutes: Record<string, { label: string; href: string }> = {
  "/": { label: "Home", href: "/" },
  "/about": { label: "About", href: "/about" },
  "/pricing": { label: "Pricing", href: "/pricing" },
  "/features": { label: "Features", href: "/features" },
  "/solutions": { label: "Solutions", href: "/solutions" },
  "/blog": { label: "Blog", href: "/blog" },
  "/contact": { label: "Contact", href: "/contact" },
  "/help": { label: "Help Center", href: "/help" },
  "/faq": { label: "FAQ", href: "/faq" },
  "/terms": { label: "Terms of Service", href: "/terms" },
  "/privacy": { label: "Privacy Policy", href: "/privacy" },
  "/editor": { label: "Editor", href: "/editor" },
  "/dashboard": { label: "Dashboard", href: "/dashboard" },
  "/dashboard/documents": { label: "Documents", href: "/dashboard/documents" },
  "/dashboard/templates": { label: "Templates", href: "/dashboard/templates" },
  "/dashboard/tools": { label: "Tools", href: "/dashboard/tools" },
  "/dashboard/settings": { label: "Settings", href: "/dashboard/settings" },
  "/dashboard/billing": { label: "Billing", href: "/dashboard/billing" },
  "/login": { label: "Login", href: "/login" },
  "/signup": { label: "Sign Up", href: "/signup" },
}

export function Breadcrumb() {
  const pathname = usePathname()
  const route = breadcrumbRoutes[pathname]

  if (route) {
    return (
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4" aria-label="Breadcrumb">
        <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          Home
          <ChevronRight className="h-3 w-3" />
        </Link>
        <span className="flex items-center gap-1 text-foreground font-medium">
          {route.label}
        </span>
      </nav>
    )
  }

  // Fallback for dynamic or unknown routes
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length > 0) {
    const last = segments[segments.length - 1]
    const label = last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    return (
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-4" aria-label="Breadcrumb">
        <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          Home
          <ChevronRight className="h-3 w-3" />
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="flex items-center gap-1 text-foreground font-medium">
          {label}
        </span>
      </nav>
    )
  }

  return null
}
