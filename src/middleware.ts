import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  navigate-to 'self';
`

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify",
  "/auth/callback",
  "/auth/mfa",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/blog",
  "/faq",
  "/help",
  "/terms",
  "/privacy",
  "/api/health",
  "/api/auth",
  "/api/webhook",
]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply CSP header
  response.headers.set("Content-Security-Policy", CSP_HEADER.replace(/\s+/g, " ").trim())

  const { pathname } = request.nextUrl

  // Skip auth check for public paths and static assets
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"))
  const isStaticAsset = pathname.startsWith("/_next/") || pathname.startsWith("/public/") || /\.[^.]+$/.test(pathname)

  if (isPublicPath || isStaticAsset) {
    return response
  }

  // Create Supabase client for auth check
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    // If Supabase not configured, allow access (dev mode)
    return response
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      async getAll() {
        return cookieStore.getAll()
      },
      async setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `set` method was called from a Server Component.
        }
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated and accessing protected routes
  if (!user && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup"))) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}