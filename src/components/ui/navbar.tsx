"use client"

import { useEffect, useRef, useState } from "react"
import { X, Menu, User, LogOut } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/solutions", label: "Solutions" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
  ]

  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let mounted = true
    async function loadUser() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data, error } = await supabase.auth.getUser()
        if (mounted && !error && data?.user) {
          setUser({ email: data.user.email ?? null })
        }
      } catch {
        // Auth unavailable — treat as signed out
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadUser()
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      router.push("/")
    } catch {
      toast({ title: "Logout failed. Please try again.", variant: "destructive" })
    }
  }

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
  }, [mobileOpen, mobileMenuRef, router])

  const isActive = (href: string) => pathname === href

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:px-4 focus-visible:py-2 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:rounded-md focus-visible:outline-none">
        Skip to content
      </a>

      <nav aria-label="Main navigation" className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/" aria-label="ForgeDocs home" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
                  F
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">ForgeDocs</span>
              </Link>
            </div>

            <div className="hidden sm:flex items-center justify-center flex-1 max-w-[600px]">
              <div className="flex items-center gap-6 w-full justify-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive(link.href) ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {loading ? (
                <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
              ) : user ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    Sign in
                  </Link>
                  <Button size="sm">
                    Start building
                  </Button>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
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
          <nav className="mt-12 space-y-5 p-6 text-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-lg font-medium transition-colors ${
                  isActive(link.href) ? "text-primary" : "text-foreground hover:text-primary"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-8 space-y-3">
              {loading ? (
                <div className="h-9 w-32 rounded-md bg-muted mx-auto animate-pulse" />
              ) : user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block w-full text-center">
                    <Button variant="outline" size="sm" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-center">
                    <Button size="sm" className="w-full">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block w-full text-center">
                    <Button variant="outline" size="sm" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="block w-full text-center">
                    <Button size="sm" className="w-full">
                      Start building
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
