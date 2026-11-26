"use client"

import { useEffect, useRef, useState } from "react"
import { X, Menu } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Documents" },
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "/faq", label: "FAQ" },
  ]

  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
      const menu = mobileMenuRef.current
      const focusableElements = menu?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements?.[0]
      const lastElement = focusableElements?.[focusableElements.length - 1]

      firstElement?.focus()

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileOpen(false)
      }

      document.addEventListener("keydown", handleTab)
      document.addEventListener("keydown", handleEscape)

      return () => {
        document.removeEventListener("keydown", handleTab)
        document.removeEventListener("keydown", handleEscape)
        document.body.style.overflow = ""
      }
    } else {
      document.body.style.overflow = ""
      return
    }
  }, [mobileOpen, mobileMenuRef])

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:px-4 focus-visible:py-2 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:rounded-md focus-visible:outline-none">
        Skip to content
      </a>

      <nav aria-label="Main navigation" className="fixed top-0 w-full z-50 border-b border-input bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <a href="/" aria-label="ForgeDocs home" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">ForgeDocs</span>
              </a>
            </div>
            <div className="hidden sm:flex items-center justify-center flex-1 max-w-[600px]">
              <div className="flex items-center gap-8 w-full justify-center">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-all ${pathname === link.href ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <a href="/auth/signup" className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                Start building
              </a>
            </div>
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 z-40 bg-background/95 backdrop-blur-lg"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute top-0 right-0 p-4">
            <button
              ref={closeButtonRef}
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-12 space-y-6 p-6 text-center">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-lg font-medium transition-all ${pathname === link.href ? "text-primary" : "text-foreground hover:text-primary"}`}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/auth/signup"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block px-6 py-3 text-lg font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              Start building
            </a>
          </nav>
        </div>
      )}
    </>
  )
}
