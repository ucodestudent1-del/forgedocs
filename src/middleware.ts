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

const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/verify",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/mfa",
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

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = publicRoutes.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )

  const protectedRoutes = [
    "/dashboard",
    "/documents",
    "/conversion",
    "/billing",
    "/editor",
    "/reader",
  ]
  const isProtectedRoute = protectedRoutes.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from auth pages (except verify, forgot-password, reset-password)
  const authOnlyRoutes = ["/auth/login", "/auth/signup"]
  const isAuthOnlyRoute = authOnlyRoutes.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )
  if (isAuthOnlyRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Enforce email verification for protected routes
  if (isProtectedRoute && user) {
    const emailConfirmed = user.email_confirmed_at
    if (!emailConfirmed && !request.nextUrl.pathname.startsWith("/auth/verify")) {
      return NextResponse.redirect(new URL("/auth/verify?type=signup", request.url))
    }
  }

  // Enforce MFA for protected routes
  if (isProtectedRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_enabled")
      .eq("id", user.id)
      .single()

    const mfaEnabled = profile?.mfa_enabled

    if (mfaEnabled && !request.nextUrl.pathname.startsWith("/auth/mfa")) {
      const mfaVerifyUrl = new URL("/auth/mfa/verify", request.url)
      mfaVerifyUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(mfaVerifyUrl)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
