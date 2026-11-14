import nextIntlMiddleware from "next-intl/middleware"

const routing = {
  locales: ["en", "es", "ar", "fr", "de", "ja", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
}

// Safety: ensure nextIntlMiddleware is a function before calling
const middlewareFn = typeof nextIntlMiddleware === "function" 
  ? nextIntlMiddleware(routing)
  : (() => { throw new Error("nextIntlMiddleware failed to load"); })()

export default middlewareFn

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}