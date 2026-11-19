"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Shield, Menu, Send, BarChart3 } from "lucide-react"

const COOKIE_CONSENT_KEY = "forgedocs:cookie_consent"

export interface CookieConsentCategories {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

const DEFAULT_CONSENT: CookieConsentCategories = {
  essential: true,
  analytics: false,
  marketing: false,
}

function getStoredConsent(): CookieConsentCategories | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as CookieConsentCategories
    return {
      essential: parsed.essential ?? true,
      analytics: parsed.analytics ?? false,
      marketing: parsed.marketing ?? false,
    }
  } catch {
    return null
  }
}

function setStoredConsent(consent: CookieConsentCategories): void {
  if (typeof window === "undefined") return
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent("cookieconsentchange", { detail: consent }))
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = React.useState<boolean>(false)
  const [consent, setConsent] = React.useState<CookieConsentCategories | null>(null)
  const [customizing, setCustomizing] = React.useState<boolean>(false)

  React.useEffect(() => {
    const stored = getStoredConsent()
    setConsent(stored)
    if (!stored) {
      setShowBanner(true)
    }

    const handleChange = () => {
      setConsent(getStoredConsent())
    }

    window.addEventListener("cookieconsentchange", handleChange)
    return () => window.removeEventListener("cookieconsentchange", handleChange)
  }, [])

  const hasConsented = consent !== null
  const isAnalyticsEnabled = consent?.analytics ?? false
  const isMarketingEnabled = consent?.marketing ?? false

  const acceptAll = () => {
    const next: CookieConsentCategories = { essential: true, analytics: true, marketing: true }
    setStoredConsent(next)
    setConsent(next)
    setShowBanner(false)
  }

  const acceptEssentialOnly = () => {
    const next: CookieConsentCategories = { essential: true, analytics: false, marketing: false }
    setStoredConsent(next)
    setConsent(next)
    setShowBanner(false)
  }

  const saveCustom = (next: CookieConsentCategories) => {
    setStoredConsent(next)
    setConsent(next)
    setCustomizing(false)
    setShowBanner(false)
  }

  if (hasConsented) return null

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[1000] bg-background border-t border-input shadow-lg transition-all duration-300",
        showBanner ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!customizing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">We use cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies to provide essential site functionality, analyze site usage, and show
                    personalized content. You can choose which categories to allow below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="essential-only"
                  type="checkbox"
                  className="rounded border-input bg-background text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed peer"
                  disabled
                  defaultChecked
                />
                <label htmlFor="essential-only" className="text-xs text-muted-foreground">
                  Essential cookies are always enabled
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end justify-end">
              <Button variant="outline" size="sm" onClick={acceptEssentialOnly} className="w-full md:w-auto">
                Essential Only
              </Button>
              <Button size="sm" onClick={acceptAll} className="w-full md:w-auto">
                Accept All
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCustomizing(true)} className="w-full md:w-auto">
                Manage Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 mb-1">
              <Menu className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Cookie Preferences</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which categories of cookies you allow. Essential cookies are required for site
              functionality and cannot be disabled.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-input">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      id="essential-toggle"
                      type="checkbox"
                      className="rounded border-input bg-background text-primary focus:ring-primary peer"
                      disabled
                      defaultChecked
                    />
                    <label htmlFor="essential-toggle" className="text-sm font-medium text-foreground">
                      Essential
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for authentication, sessions, and security
                  </p>
                </div>
                <span className="text-xs font-medium text-primary">Always on</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-input">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      id="analytics-toggle"
                      type="checkbox"
                      checked={isAnalyticsEnabled}
                      onChange={(e) =>
                        setConsent((prev) => ({ ...(prev ?? DEFAULT_CONSENT), analytics: e.target.checked }))
                      }
                      className="rounded border-input bg-background text-primary focus:ring-primary peer"
                    />
                    <label htmlFor="analytics-toggle" className="text-sm font-medium text-foreground">
                      Analytics
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Helps us understand how visitors use the site
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-input">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      id="marketing-toggle"
                      type="checkbox"
                      checked={isMarketingEnabled}
                      onChange={(e) =>
                        setConsent((prev) => ({ ...(prev ?? DEFAULT_CONSENT), marketing: e.target.checked }))
                      }
                      className="rounded border-input bg-background text-primary focus:ring-primary peer"
                    />
                    <label htmlFor="marketing-toggle" className="text-sm font-medium text-foreground">
                      Marketing
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for personalized content and campaign measurement
                  </p>
                </div>
                <Send className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end justify-end pt-4">
              <Button variant="outline" size="sm" onClick={() => setCustomizing(false)} className="w-full md:w-auto">
                Back
              </Button>
              <Button variant="outline" size="sm" onClick={acceptEssentialOnly} className="w-full md:w-auto">
                Essential Only
              </Button>
              <Button size="sm" onClick={() => saveCustom(consent ?? DEFAULT_CONSENT)} className="w-full md:w-auto">
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <CookieConsentBanner />
      {children}
    </>
  )
}

export function useCookieConsent(): CookieConsentCategories | null {
  const [consent, setConsent] = React.useState<CookieConsentCategories | null>(null)

  React.useEffect(() => {
    setConsent(getStoredConsent())

    const handleChange = () => {
      setConsent(getStoredConsent())
    }

    window.addEventListener("cookieconsentchange", handleChange)
    return () => window.removeEventListener("cookieconsentchange", handleChange)
  }, [])

  return consent
}

export function hasCookieConsent(category: "analytics" | "marketing"): boolean {
  if (typeof window === "undefined") return false
  const stored = getStoredConsent()
  return stored?.[category] ?? false
}
