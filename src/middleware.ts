import nextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

export default nextIntlMiddleware(routing)

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}