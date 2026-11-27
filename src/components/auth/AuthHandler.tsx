"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/auth/forgot-password", "/auth/reset-password", "/auth/verify"]

export function AuthHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleUnauthorized = () => {
      // Do not redirect if already on an auth page (prevents redirect loops)
      if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
        return
      }
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }

    window.addEventListener("forge:unauthorized", handleUnauthorized)
    return () => {
      window.removeEventListener("forge:unauthorized", handleUnauthorized)
    }
  }, [router, pathname])

  return null
}
