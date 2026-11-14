import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createRouteClient } from "@/lib/supabase"
import { locales, defaultLocale } from "@/i18n/locales"

const ADMIN_PATH_PREFIXES = ["/admin", `/${defaultLocale}/admin`]

function getLocale(request: NextRequest): string {
  const pathname = request.nextUrl.pathname

  // 1. Check if pathname already starts with a locale
  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  if (pathnameLocale) {
    return pathnameLocale
  }

  // 2. Check cookie (set by client language switcher / settings)
  const cookieLocale = request.cookies.get("locale")?.value
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale
  }

  // 3. Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
      .find((l) => locales.includes(l as any))
    if (preferred) {
      return preferred
    }
  }

  return defaultLocale
}

async function getProfileLocale(request: NextRequest): Promise<string | null> {
  try {
    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single()

    if (profile?.language && locales.includes(profile.language as any)) {
      return profile.language
    }
  } catch {
    // Fail closed: fall back to cookie / Accept-Language / default
  }
  return null
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API, static assets, and internal Next.js routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/_not-found") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Admin route protection
  if (isAdminPath(pathname)) {
    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = `/${defaultLocale}/auth/login`
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Resolve locale: profile (DB) > cookie > Accept-Language > default
  let locale = await getProfileLocale(request)
  if (!locale) {
    locale = getLocale(request)
  }

  // Check if pathname already has a locale
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )

  if (!hasLocale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    const response = NextResponse.redirect(url)
    // Set locale cookie so subsequent requests pick it up without a DB hit
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    })
    return response
  }

  // Ensure cookie matches resolved locale for consistency
  const currentCookie = request.cookies.get("locale")?.value
  if (currentCookie !== locale) {
    const response = NextResponse.next()
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}
