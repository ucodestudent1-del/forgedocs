import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale, type Locale } from "@/i18n/locales"

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl?.pathname ?? "/"

    // Generate request ID for distributed tracing
    const requestId = request.headers?.get?.("x-request-id") ?? generateRequestId()

    // Skip all non-page routes
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.includes(".")
    ) {
      const response = NextResponse.next()
      response.headers.set("x-request-id", requestId)
      return response
    }

    // Minimal locale handling - only redirect if no locale in URL
    const pathnameHasLocale = locales.some(
      (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
    )

    if (!pathnameHasLocale) {
      let locale: string = defaultLocale

      // Safe cookie read
      try {
        const cookieLocale = request.cookies?.get?.("locale")?.value
        if (cookieLocale && locales.includes(cookieLocale as any)) {
          locale = cookieLocale
        }
      } catch {}

      // Safe accept-language read
      if (locale === defaultLocale) {
        try {
          const acceptLanguage = request.headers?.get?.("accept-language")
          if (acceptLanguage) {
            const preferred = acceptLanguage
              .split(",")
              .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
              .find((l) => locales.includes(l as any))
            if (preferred && typeof preferred === "string") {
              locale = preferred
            }
          }
        } catch {}
      }

      // Redirect with locale
      const url = request.nextUrl?.clone?.() ?? new URL(request.url)
      url.pathname = `/${locale}${pathname}`
      const response = NextResponse.redirect(url)
      response.headers.set("x-request-id", "req-" + Date.now())
      try {
        response.cookies.set("locale", locale, {
          path: "/",
          maxAge: 31536000,
          sameSite: "strict",
        })
      } catch {}
      return response
    }

    // Pass through for pages with locale
    const response = NextResponse.next()
    response.headers.set("x-request-id", "req-" + Date.now())
    return response
  } catch {
    // Never crash the middleware
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}