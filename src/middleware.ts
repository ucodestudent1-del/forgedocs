import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createRouteClient } from "@/lib/supabase"

const locales = ["en", "es", "ar", "fr", "de", "ja", "zh"]
const defaultLocale = "en"

const ADMIN_PATH_PREFIXES = ["/admin", `/${defaultLocale}/admin`]

function getLocale(request: NextRequest): string {
  const pathname = request.nextUrl.pathname

  // Check if pathname already starts with a locale
  const pathnameLocale = locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
  if (pathnameLocale) {
    return pathnameLocale
  }

  // Check cookie
  const cookieLocale = request.cookies.get("locale")?.value
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
      .find((l) => locales.includes(l))
    if (preferred) {
      return preferred
    }
  }

  return defaultLocale
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
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

  // Check if pathname already has a locale
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (!hasLocale) {
    const locale = getLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}