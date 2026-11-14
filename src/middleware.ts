import nextIntlMiddleware from "next-intl/middleware"

const routing = {
  locales: ["en", "es", "ar", "fr", "de", "ja", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
}

export default nextIntlMiddleware(routing)

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}